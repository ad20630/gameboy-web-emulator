import { EmulatorScreen } from "@/components/EmulatorScreen";
import { ControlsHelp } from "@/components/ControlsHelp";
import { SettingsMenu } from "@/components/SettingsMenu";

export default function Home() {
  return (
    <main className="flex h-svh flex-col items-center gap-4 overflow-hidden p-4 sm:gap-6 sm:p-12 phone-landscape:flex-row phone-landscape:items-stretch phone-landscape:gap-0 phone-landscape:p-0">
      <ControlsHelp />
      <SettingsMenu />
      <h1 className="shrink-0 text-2xl font-semibold tracking-tight phone-landscape:hidden">
        Web DMG
      </h1>
      <EmulatorScreen />
    </main>
  );
}
