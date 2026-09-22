import { EmulatorScreen } from "@/components/EmulatorScreen";
import { ControlsHelp } from "@/components/ControlsHelp";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-4 sm:p-12">
      <ControlsHelp />
      <h1 className="text-2xl font-semibold tracking-tight">
        Web DMG
      </h1>
      <EmulatorScreen />
    </main>
  );
}
