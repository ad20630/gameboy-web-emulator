import { EmulatorScreen } from "@/components/EmulatorScreen";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        GB Web Emulator
      </h1>
      <EmulatorScreen />
    </main>
  );
}
