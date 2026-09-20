import { notFound } from "next/navigation";
import { getReplayMetadata } from "@/lib/replayStorage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { gameId } = await params;
  return {
    title: `Game ${gameId} Replay`,
    description: `Watch the locked official AVHL replay for Game ${gameId}.`,
  };
}

export default async function OfficialReplayPage({ params }) {
  const { gameId } = await params;
  const number = Number.parseInt(String(gameId), 10);
  if (!Number.isInteger(number) || number < 1 || number > 1640) notFound();
  const metadata = await getReplayMetadata(number);
  if (!metadata) notFound();

  return (
    <main className="bg-[#050816]">
      <iframe
        src={`/sim/index.html?replay=${number}`}
        title={`AVHL Official Game ${number} Replay`}
        className="block h-[calc(100vh-65px)] min-h-[760px] w-full border-0 bg-[#050816]"
      />
    </main>
  );
}
