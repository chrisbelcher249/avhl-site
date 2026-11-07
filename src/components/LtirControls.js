"use client";

import { useCallback, useEffect, useState } from "react";

function money(value) {
  return `$${(Number(value || 0) / 1_000_000).toFixed(2)}M`;
}

export default function LtirControls({ team }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/ltir/${encodeURIComponent(team.abbreviation)}`, { cache: "no-store" });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || "Unable to load LTIR status.");
    setState(data);
  }, [team.abbreviation]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`/api/ltir/${encodeURIComponent(team.abbreviation)}`, { cache: "no-store" });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "Unable to load LTIR status.");
        if (!cancelled) setState(data);
      } catch (cause) {
        if (!cancelled) setError(cause.message || "LTIR status unavailable.");
      }
    };
    run();
    return () => { cancelled = true; };
  }, [team.abbreviation]);

  async function change(playerId, action) {
    if (!password) {
      setError("Enter your team password before making an LTIR change.");
      return;
    }
    setBusy(`${action}:${playerId}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/ltir/${encodeURIComponent(team.abbreviation)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, playerId, action }),
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error || "LTIR change was rejected.");
      setMessage(action === "designate" ? "LTIR designation saved." : "Player reactivated successfully.");
      setPassword("");
      await refresh();
    } catch (cause) {
      setError(cause.message || "The change could not be saved.");
    } finally {
      setBusy("");
    }
  }

  const pending = state?.pendingActivation || [];
  const eligible = state?.eligible || [];
  const designated = new Set(state?.designated || []);

  return (
    <section id="ltir" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-14 md:px-8">
      <div className="rounded-[2rem] border border-[#000B36]/10 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A90117]">Team transactions</p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">Long-Term Injured Reserve</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#000B36]/55">
              LTIR is never automatic. Players injured for 10 or more games may be designated by their owner.
              The $70M salary floor applies before LTIR relief; effective payroll may fall below it solely due to LTIR.
              Once the final missed game ends, relief expires, and the owner must restore cap and roster compliance before the player's first eligible puck drop.
            </p>
          </div>
          {state && <div className="rounded-xl bg-[#F4F7FB] px-4 py-3 text-sm font-black">
            Effective cap: {money(state.cap)} · LTIR relief: {money(state.ltirRelief)}
          </div>}
        </div>

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-[#A90117]">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p>}
        {!state && !error && <p className="mt-5 text-sm font-bold text-[#000B36]/50">Loading LTIR status…</p>}

        {state && (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {eligible.map((injury) => (
                <div key={injury.playerId} className="rounded-2xl border border-[#000B36]/10 bg-[#F7F9FC] p-4">
                  <p className="font-black">{injury.playerName}</p>
                  <p className="mt-1 text-xs font-bold text-[#000B36]/50">{injury.gamesMissed} games assigned · {injury.gamesRemaining} remaining</p>
                  <button type="button" disabled={designated.has(String(injury.playerId)) || Boolean(busy)}
                    onClick={() => change(injury.playerId, "designate")}
                    className="mt-3 rounded-full bg-[#000B36] px-4 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                    {designated.has(String(injury.playerId)) ? "On LTIR" : "Designate LTIR"}
                  </button>
                </div>
              ))}
              {pending.map((entry) => (
                <div key={entry.playerId} className="rounded-2xl border border-amber-400/40 bg-amber-50 p-4">
                  <p className="font-black">{entry.playerName} — Ready to Return</p>
                  <p className="mt-1 text-xs font-bold text-amber-950/65">
                    Relief has ended. Reactivate before the first eligible game ({entry.expectedReturnDate || "schedule TBD"}).
                  </p>
                  <button type="button" disabled={Boolean(busy)} onClick={() => change(entry.playerId, "reactivate")}
                    className="mt-3 rounded-full bg-[#000B36] px-4 py-2 text-xs font-black text-white disabled:opacity-40">
                    Reactivate
                  </button>
                </div>
              ))}
            </div>
            {!eligible.length && !pending.length && <p className="mt-5 text-sm font-bold text-[#000B36]/45">No players are currently eligible for an LTIR designation or awaiting reactivation.</p>}
            {(eligible.length > 0 || pending.length > 0) && (
              <div className="mt-5 max-w-sm">
                <label htmlFor={`ltir-password-${team.abbreviation}`} className="mb-2 block text-xs font-black uppercase tracking-wide text-[#000B36]/60">
                  Team password (required for changes)
                </label>
                <input id={`ltir-password-${team.abbreviation}`} type="password" autoComplete="off"
                  value={password} onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-[#000B36]/15 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#18BDFC]"
                  placeholder="Enter team password" />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
