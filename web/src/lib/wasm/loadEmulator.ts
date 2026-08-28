import type { EmulatorModule, EmulatorModuleFactory } from "./types";

const WASM_GLUE_PATH = "/wasm/gb_core.js";

export async function loadEmulatorModule(): Promise<EmulatorModule> {
  const { default: createGbCoreModule } = (await import(
    /* webpackIgnore: true */ WASM_GLUE_PATH
  )) as { default: EmulatorModuleFactory };

  return createGbCoreModule({
    locateFile: (path: string) => `/wasm/${path}`,
  });
}
