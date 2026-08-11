import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = { title: "Schedule" };

export default function Schedule() {
  return <PlaceholderPage eyebrow="2026–27 season" title="Schedule" description="The full Major League schedule will live here with team filters, dates, and home/away matchups." items={[["Daily slate","A clean league-wide view of games by date."],["Team filters","Jump directly to any club's schedule."],["Results ready","The same structure can display completed-game scores later in the season."]]} />;
}
