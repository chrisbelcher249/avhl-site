import assert from "node:assert/strict";
import { upcomingGameVenue } from "../src/lib/upcomingGameVenue.js";

const liveTeams = {
  "honolulu-hawks": { arena: "Hawaiian Airlines Arena" },
  "baltimore-oceanics": { arena: "Old Bay Arena" },
  "chicago-rockets": { arena: "Rockets Arena at Lincoln Park" },
  "long-island-blizzard": { arena: "Test Home Arena" },
};

// A team's away games must show the opponent's current live venue.
assert.equal(upcomingGameVenue({ home: "honolulu-hawks", away: "long-island-blizzard" }, liveTeams), "Hawaiian Airlines Arena");
assert.equal(upcomingGameVenue({ home: "baltimore-oceanics", away: "long-island-blizzard" }, liveTeams), "Old Bay Arena");
assert.equal(upcomingGameVenue({ home: "chicago-rockets", away: "long-island-blizzard" }, liveTeams), "Rockets Arena at Lincoln Park");

// Home fixtures show the viewing team's live home arena.
assert.equal(upcomingGameVenue({ home: "long-island-blizzard", away: "chicago-rockets" }, liveTeams), "Test Home Arena");
assert.equal(upcomingGameVenue({ home: "missing", away: "chicago-rockets" }, liveTeams), "Venue TBD");

// When Google Sheets updates a team's arena, the card must use the new value
// without relying on the bundled static team definitions.
liveTeams["honolulu-hawks"].arena = "Updated Arena Name";
assert.equal(upcomingGameVenue({ home: "honolulu-hawks" }, liveTeams), "Updated Arena Name");

console.log("Upcoming-game cards use live home-team arenas, including after changes: PASS");
