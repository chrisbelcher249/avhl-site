import { notFound } from "next/navigation";
import EditableLineupPage from "@/components/EditableLineupPage";
import { teams as fallbackTeams } from "../../../../../data/teams";
import { getTeamBySlug } from "@/lib/teams";
import { getEffectiveLineup } from "@/lib/lineupService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateStaticParams() {
  return fallbackTeams.map((team) => ({ slug: team.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { team } = await getTeamBySlug(slug);
  if (!team) return {};
  return {
    title: `${team.name} Lineup`,
    description: `${team.name} forward lines, defense pairs, goalies, special teams, overtime groups and shootout order for the 2026–27 AVHL season.`,
  };
}

export default async function TeamLineupPage({ params }) {
  const { slug } = await params;
  const { team, teams } = await getTeamBySlug(slug);
  if (!team) notFound();

  const effective = await getEffectiveLineup(team.abbreviation);
  if (!effective) notFound();

  return (
    <EditableLineupPage
      team={team}
      teams={teams}
      rosterPlayers={effective.rosterPlayers}
      initialRecord={effective.record}
      initialSource={effective.source}
      rosterSource={effective.rosterSource}
      storage={effective.storage}
      storageError={effective.storageError}
      savedErrors={effective.savedErrors}
    />
  );
}
