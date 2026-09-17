# Site 48 changes

## Odds futures
- Kept `/odds` as the game-odds landing page and added a dedicated odds sub-navigation.
- Added `/odds/divisions` with all four division-title futures tables.
- Added `/odds/presidents-trophy` with all 40 clubs ranked by probability of finishing No. 1 overall.
- Added `/odds/cup` with all 40 clubs ranked by championship probability.
- Futures run 3,000 complete remaining-season Monte Carlo simulations using the same live roster/lineup strength model as Game Odds.
- Completed official results are locked into every simulated season.
- Regular-season simulations use the official AVHL standings tiebreakers.
- Cup simulations use the current AVHL 20-team conference format: 7–10 qualifiers (best-of-five), then Round 1 through the League Final as best-of-seven.
- Futures explicitly use the requested assumption that EA-played games and AVHL simulator games are equivalent draws from the same team-strength distribution.
- Refactored the Game Odds math into `src/lib/oddsModel.js` so game odds and futures share one model instead of separate formulas.

## Team hashtags
- Major team pages now include **Official hashtag** alongside Arena, Mascot, Division, and Rostered players in Club Identity.
- The live branding loader now recognizes `Hashtag`, `Team Hashtag`, or `Official Hashtag` columns in the existing team-branding Google Sheet.
- Hashtags are normalized to include a leading `#` and remove spaces.
- No hashtags were invented in bundled fallback data; until a hashtag exists in the branding sheet, that team shows `—`.

## Footer
- Kept the social/footer redesign.
- Gave **More AVHL** additional desktop width and made its links non-wrapping so **Info · History · Champions · Brackets · Minor League** stays on one line.

## Verification
- Existing simulator and lineup test suites remain unchanged and pass.
- The futures core was benchmarked separately at 3,000 full 1,640-game seasons plus playoffs in about one second in the development container using synthetic team models.
- Full `next build` could not be run in this container because the local `next` executable is not installed in the bundled dependencies.
