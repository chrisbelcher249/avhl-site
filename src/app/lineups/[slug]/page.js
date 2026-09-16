import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyLineupPage({ params }) {
  const { slug } = await params;
  redirect(`/teams/${slug}/lineups`);
}
