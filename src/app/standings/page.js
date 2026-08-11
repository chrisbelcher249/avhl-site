import PlaceholderPage from "@/components/PlaceholderPage";

export const metadata = { title: "Standings" };

export default function Standings() {
  return <PlaceholderPage eyebrow="Major League" title="Standings" description="The 2026–27 league table will live here, organized by conference and division." items={[["Division race","Pacific, Central, Atlantic, and Metropolitan tables."],["Playoff picture","A clear view of qualification and postseason positioning."],["Relegation pressure","Season-long context for the clubs fighting at the bottom."]]} />;
}
