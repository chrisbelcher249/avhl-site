import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = { title: "Statistics" };

export default function Statistics() {
  return <PlaceholderPage eyebrow="Player database" title="Statistics" description="League leaders and searchable player statistics will live here once the 2026–27 stat feed is connected." items={[["Skaters","Goals, assists, points, shooting, and other player totals."],["Goaltenders","Starts, wins, save percentage, goals-against average, and shutouts."],["Leaderboards","Season leaders, team filters, and historical comparisons."]]} />;
}
