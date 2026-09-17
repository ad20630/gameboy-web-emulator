export interface EmulatorButtonValue {
  value: number;
}

export interface EmulatorButtonEnum {
  Right: EmulatorButtonValue;
  Left: EmulatorButtonValue;
  Up: EmulatorButtonValue;
  Down: EmulatorButtonValue;
  A: EmulatorButtonValue;
  B: EmulatorButtonValue;
  Select: EmulatorButtonValue;
  Start: EmulatorButtonValue;
}

export interface EmulatorInstance {
  reset(): void;
  loadRom(data: Uint8Array): void;
  runFrame(): void;
  getFramebuffer(): Uint8Array;
  setButtonPressed(button: EmulatorButtonValue, pressed: boolean): void;
}

export interface EmulatorModule {
  Emulator: new () => EmulatorInstance;
  Button: EmulatorButtonEnum;
}

export type EmulatorModuleFactory = (
  options?: Record<string, unknown>
) => Promise<EmulatorModule>;
