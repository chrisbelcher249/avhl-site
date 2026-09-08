export const metadata = {
  title: "Game Simulator",
  description: "Run AVHL Major League games in the V6.1 spatial hockey simulator.",
};

export default function SimulatorPage() {
  return (
    <main className="bg-[#050816]">
      <iframe
        src="/sim/index.html"
        title="AVHL Game Simulator V6.1"
        className="block h-[calc(100vh-65px)] min-h-[760px] w-full border-0 bg-[#050816]"
      />
    </main>
  );
}
