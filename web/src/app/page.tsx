import { EmulatorScreen } from "@/components/EmulatorScreen";
import { ControlsHelp } from "@/components/ControlsHelp";

export default function Home() {
  return (
    <main className="flex h-svh flex-col items-center gap-4 overflow-hidden p-4 sm:gap-6 sm:p-12">
      <ControlsHelp />
      <h1 className="shrink-0 text-2xl font-semibold tracking-tight">
        Web DMG
      </h1>
      <EmulatorScreen />
    </main>
  );
}
