# AVHL 2026–27 cap operations

This is the commissioner's manual workflow for the 28-player roster limit, retained salary, waiver penalties, and LTIR. **Never edit original contract salaries or terms** to simulate cap transactions.

## Trades and retained salary

The existing Google Trade Tracker remains the authoritative record of completed trades. In **Trades / Salary Retention (Column I)** use semicolon-separated entries:

- `F John Smith — ARI retains 50%`
- `F John Smith — ARI retains 50%; F John Smith — CHI retains 50% of remaining`
- `D Jane Smith — DEN retains 25%`

Use **actual AVHL franchise abbreviations** (e.g. ARI, CHI, DEN). A retention event can be 0–50% of the transferring team's currently remaining salary obligation; there may be at most two events on the same original contract, split across up to three teams. The backend freezes the annual shares and their original remaining contract terms in the persistent ledger on its first observation of the official trade. Invalid text is surfaced as a commissioner warning rather than silently processed.

## Waiver form, Discord, and the Waivers tab

1. Owners place a player on waivers using the existing owner waiver form.
2. The commissioner announces the player on Discord and opens a **24-hour** claim window. The commissioner applies reverse points-percentage standings priority **as it was at opening**, with reverse standings tiebreakers. The site does not automate claim ranking or the clock.
3. In the **Waivers tab** of the same Trade Tracker workbook, manually enter **Team**, **Player**, and **Outcome**. Use `On Waivers` while the claim window runs.
4. When claimed, mark `Claimed` and enter the winning **Claimed By** AVHL team abbreviation. The player's original contract obligation moves to the claimant, subject to all retained shares. The commissioner must verify that the winning team can legally absorb the player under cap and roster rules.
5. If nobody claims, mark `Cleared`. **In AVHL this is a release**, not a demotion: the player becomes a free agent and the releasing team retains **25% of its own remaining annual cap obligation** for every remaining original contract season. Earlier teams' retained charges continue independently.

**Waiver dead-cap cutoff:** The 25% release penalty applies to waiver submissions dated **November 6, 2026 or later** (inclusive). The imported September–November 5 waivers are marked `Cleared` for history but carry **no penalty and no current roster/contract change**, even if a former player was later traded or signed elsewhere. The optional `Submitted At` field (Column E) identifies historical waiver dates. Leave it blank for new transactions; blank dates are treated as post-cutoff. The imported 52 historical waiver form submissions produced 53 player entries because one request listed two players.

The Waivers tab is the **official decision log**, not an automated Discord bot. Never delete historical waiver rows. The website applies valid manual ownership changes as a read-time overlay, without editing the original player/contract Sheet. A release or retained salary is frozen in Redis when first observed, so later roster/contract changes cannot erase its recorded remaining-term charge. If the player name is ambiguous or a claimed destination is missing, the system warns instead of guessing.

## Public transactions and the Signings tab

The public **/transactions** page aggregates the existing Trades and Waivers tabs plus the new **Signings** tab in the same Trade Tracker workbook. The original detailed **/trades** page remains available.

For each completed signing, **append one row** to the Signings tab using exactly four columns:

- **Player:** Exact official AVHL player name (do not prefix F/D/G).
- **Team:** Official AVHL abbreviation (e.g. CHI) or full franchise name.
- **Term:** Number of contract years, e.g. `3`.
- **AAV:** Annual dollar salary, e.g. `4500000` (formats as $4,500,000) or `4.5M` in plain text.

The website validates all four fields and identifies players by exact normalized name; ambiguous player names and invalid rows generate warnings rather than a guessed player. Signings are included in the public feed automatically. A valid signing is also a derived overlay to the public player roster and cap calculations **only if** the live player record is a UFA or already shows the signing team. This prevents an old signing from overriding a later trade recorded in the source database. **Never edit an original source contract merely to simulate a signing in the public display.** The source player sheet itself is not modified by the integration.

The historical UFA import contained 191 *requests*, including competing offers. To avoid publishing losing bids as completed signings, 77 entries matching the current official player/team/AAV/term were added to **Signings** and flagged `Historical=Yes` in hidden column F. They are display-only and never replay contract/roster changes. All 191 requests (excluding email addresses) were saved in the separate **UFA Request Archive** tab, where unverified bids remain available for manual review. Historical signings' hidden `Submitted At` field (Column E) stores original form submission times. New signings use only the four visible columns.

Waiver stages are archived in a separate Redis transaction journal when first observed, allowing the initial waiver listing and subsequent claim/release to appear independently. Signings also remain in the journal. Historical records use their original form **submission** dates and are labeled `Submitted`; this is not a claimed final clearance/contract-execution time. New entries without submission dates use `Logged`, the time first observed by the website. Existing trades retain their official dates. Do not overwrite or delete prior rows to log new transactions; append new rows.

## LTIR

- Owners explicitly designate LTIR on their **team page**, using their existing owner password. There is no automatic placement.
- Eligible: active injury of **at least ten games missed** (based on the official injury record).
- Relief applies only to the current team's remaining salary share, after any retained salary. Other teams' retention remains charged.
- The **$70M floor** is evaluated on contractual cap obligations **before LTIR relief**, including retained salary and dead cap. LTIR may lower effective payroll below $70M without a floor violation, but teams must not otherwise fall below $70M. The site marks an otherwise compliant LTIR-only exception green.
- An LTIR player does not occupy one of the **28 active roster slots** during an eligible designation.
- The designation's relief ends immediately after the **final game missed**, not at some arbitrary manual reset.
- Owners have through **puck drop of the player's first eligible game back** to become compliant and reactivate. Reactivation is refused above the **$100M cap** or **28 active players**.
- A recovered player left unreactivated is not permitted into a lineup; the simulator blocks a game involving that team until LTIR is resolved. Healthy-player LTIR cannot be used as indefinite cap relief.

## Audit and infrastructure

The backend reads the Trade Tracker, the official live player database, the injury tracker/schedule, and persistent Redis (the existing injury/lineup backend). Release snapshots, retained-cap snapshots, and LTIR designations live in their own Redis hashes. The original contracts Sheet is **never written**.

The page /cap and each team page show derived cap status. The standalone /trades page continues to show two-team and three-team trades without revealing the private Notes column. Cap data read failures show a warning rather than silently treating a team as fully compliant.

**Manual responsibilities remain:** announcing and adjudicating Discord claims; entering the final Waivers status and Claiming Team; confirming all trading teams approve; and updating any separate real-world roster administration required outside the site's read-time overlay.
