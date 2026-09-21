// Streams the core's audio output through an AudioWorklet-backed ring
// buffer (see public/audio/gb-audio-processor.js) rather than scheduling a
// series of AudioBufferSourceNodes. The latter sounds fine in isolation but
// each independently-scheduled buffer is resampled from the emulator's rate
// to the device's native rate with no filter continuity from the previous
// chunk, producing an audible artifact at every chunk boundary. Streaming
// through one continuous node avoids that, and this class exposes the
// context's exact native sampleRate so the core can be told to generate
// audio at that rate directly, skipping resampling entirely.
//
// The AudioContext is created eagerly (in the constructor) since merely
// constructing one and reading its sampleRate doesn't require a user
// gesture - only resume() does, which callers must invoke from one (e.g.
// the ROM load handler) to satisfy the autoplay policy.
export class GbAudioPlayer {
  private readonly context: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private gainNode: GainNode | null = null;
  private readonly readyPromise: Promise<void>;

  constructor() {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new AudioContextCtor();
    this.readyPromise = this.context.audioWorklet
      .addModule("/audio/gb-audio-processor.js")
      .then(() => {
        const workletNode = new AudioWorkletNode(this.context, "gb-audio-processor", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
        });
        const gainNode = this.context.createGain();
        workletNode.connect(gainNode);
        gainNode.connect(this.context.destination);
        this.workletNode = workletNode;
        this.gainNode = gainNode;
      });
  }

  // The device's actual native sample rate - pass this to the core's
  // setAudioSampleRate() so it generates audio at exactly this rate.
  get sampleRate(): number {
    return this.context.sampleRate;
  }

  // Resolves once the worklet is loaded and ready to receive push()es.
  waitUntilReady(): Promise<void> {
    return this.readyPromise;
  }

  // Must be called from a user-gesture handler (autoplay policy).
  resume() {
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  setMuted(muted: boolean) {
    if (this.gainNode) this.gainNode.gain.value = muted ? 0 : 1;
  }

  // `interleaved` is stereo float32 (L, R, L, R, ...) as produced by the
  // core, at this.sampleRate. Deinterleaved copies are transferred to the
  // worklet's own thread rather than posted by reference.
  push(interleaved: Float32Array) {
    const workletNode = this.workletNode;
    if (!workletNode || interleaved.length === 0) return;

    const frameCount = interleaved.length / 2;
    const left = new Float32Array(frameCount);
    const right = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      left[i] = interleaved[i * 2];
      right[i] = interleaved[i * 2 + 1];
    }
    workletNode.port.postMessage({ left, right }, [left.buffer, right.buffer]);
  }

  close() {
    this.workletNode?.disconnect();
    this.gainNode?.disconnect();
    void this.context.close();
    this.workletNode = null;
    this.gainNode = null;
  }
}
