export interface EmulatorInstance {
  reset(): void;
}

export interface EmulatorModule {
  Emulator: new () => EmulatorInstance;
}

export type EmulatorModuleFactory = (
  options?: Record<string, unknown>
) => Promise<EmulatorModule>;
