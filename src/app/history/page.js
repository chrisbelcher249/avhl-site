import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = { title: "History" };

export default function History() {
  return <PlaceholderPage eyebrow="League archive" title="History" description="Champions, playoff runs, records, awards, and defining AVHL moments will be organized here as the historical database is connected." items={[["Champions","Season-by-season Cup winners and postseason paths."],["Records","Franchise and individual milestones across AVHL history."],["Moments","The games and plays that became part of league lore."]]} />;
}
