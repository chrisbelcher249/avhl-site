# Site 47 changes

## Odds
- Added `/odds` and placed **Odds** between **Sim** and **Cap** in the main navigation.
- The page automatically shows upcoming unplayed schedule slates.
- Uses the same live 20-player active lineup records served to the simulator, including owner-saved, projected, and auto-optimized lineup states.
- Runs 25,000 deterministic score-only Monte Carlo outcomes per matchup in the browser.
- Model inputs include weighted forward lines, defense pairs, PP/PK units, faceoffs, discipline, skating pace, and the starting goalie's save/rebound/recovery profile.
- Shows win probability, fair American moneyline, projected score, O/U 6.5 probabilities, and home -1.5 cover probability.
- Odds generation does not create official games, injuries, player stats, or write anything to Google Sheets.

## Simulator
- Added a headless `simulateScoreOnly()` path to V6.7.1 for future full-event Monte Carlo experiments.
- Headless mode suppresses replay/spatial presentation payloads while preserving the same event logic. Existing normal simulator behavior is unchanged.

## Footer
- Added Odds to League Tools.
- Rebalanced the desktop footer columns and forced **Info · History · Champions · Brackets · Minor League** onto one line at normal desktop widths.
