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

The Waivers tab is the **official decision log**, not an automated Discord bot. Never delete historical waiver rows. The website applies valid manual ownership changes as a read-time overlay, without editing the original player/contract Sheet. A release or retained salary is frozen in Redis when first observed, so later roster/contract changes cannot erase its recorded remaining-term charge. If the player name is ambiguous or a claimed destination is missing, the system warns instead of guessing.

## LTIR

- Owners explicitly designate LTIR on their **team page**, using their existing owner password. There is no automatic placement.
- Eligible: active injury of **at least ten games missed** (based on the official injury record).
- Relief applies only to the current team's remaining salary share, after any retained salary. Other teams' retention remains charged.
- A designation cannot be made if it would take the team's effective payroll below the **$70M floor**.
- An LTIR player does not occupy one of the **28 active roster slots** during an eligible designation.
- The designation's relief ends immediately after the **final game missed**, not at some arbitrary manual reset.
- Owners have through **puck drop of the player's first eligible game back** to become compliant and reactivate. Reactivation is refused above the **$100M cap** or **28 active players**.
- A recovered player left unreactivated is not permitted into a lineup; the simulator blocks a game involving that team until LTIR is resolved. Healthy-player LTIR cannot be used as indefinite cap relief.

## Audit and infrastructure

The backend reads the Trade Tracker, the official live player database, the injury tracker/schedule, and persistent Redis (the existing injury/lineup backend). Release snapshots, retained-cap snapshots, and LTIR designations live in their own Redis hashes. The original contracts Sheet is **never written**.

The page /cap and each team page show derived cap status. The standalone /trades page continues to show two-team and three-team trades without revealing the private Notes column. Cap data read failures show a warning rather than silently treating a team as fully compliant.

**Manual responsibilities remain:** announcing and adjudicating Discord claims; entering the final Waivers status and Claiming Team; confirming all trading teams approve; and updating any separate real-world roster administration required outside the site's read-time overlay.
