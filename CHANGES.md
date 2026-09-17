# Site 49 changes

## Team hashtags from Team Specs
- Team pages continue to show **Official hashtag** in Club Identity.
- The live Team Specs sheet is now the direct source of truth for hashtags.
- The loader accepts common hashtag header variants, including plural/spacing changes, and also recognizes the current Team Specs placement where the hashtag is the second column from the right.
- Hashtags are normalized to include a leading `#` and remove spaces.
- The positional fallback is guarded so an unrelated Team Specs field cannot accidentally become a hashtag.

## Footer one-line desktop links
- Increased the footer desktop content width so the navigation no longer gets squeezed into the old 1280px shell.
- **League**, **League Tools**, and **More AVHL** all stay on one line at normal desktop widths.
- Slightly tightened link spacing/font sizing where needed while preserving the larger social/branding area above.
- Mobile/tablet layouts can still wrap naturally.

## Carried forward from Site 48
- Game Odds, Division Futures, Presidents' Trophy, and Cup odds pages.
- Minor League expansion, live standings/schedule, and promotion line.
- Major League relegation line.
- Stats leaders redesign, lineup auto-fallbacks, bracket cleanup, live official stats integration, Vercel Analytics, and social footer links.

## Verification
- `test:sim` PASS.
- `test:lineups` PASS.
- `test:sim-lineups` PASS.
- `test:lineup-storage` PASS.
- Full `next build` could not run in this container because the bundled `node_modules` does not contain the local `next` executable.
