"use client";

import { useEffect, useState, useCallback } from "react";

interface GolferPoolData {
  name: string;
  position: number | null;
  score: string;
  today: string;
  thru: string;
  status: string;
  isTied: boolean;
  currentDollars: number;
  expectedDollars: number;
  winProbability: number | null;
  evMethod: string;
  odds: number | null;
  selectedByCount: number;
  selectedBy: string[];
}

interface EntrantStanding {
  name: string;
  golfers: GolferPoolData[];
  currentDollars: number;
  expectedDollars: number;
  rank: number;
}

interface DashboardData {
  standings: EntrantStanding[];
  players: GolferPoolData[];
  leaderboardUpdated: string | null;
  oddsUpdated: string | null;
  errors: string[];
}

function formatMoney(amount: number): string {
  if (amount === 0) return "$0";
  return "$" + amount.toLocaleString("en-US");
}

function formatOdds(odds: number | null): string {
  if (odds === null) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatPct(prob: number | null): string {
  if (prob === null) return "—";
  return (prob * 100).toFixed(1) + "%";
}

function formatTime(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function scoreClass(score: string): string {
  if (score.startsWith("-")) return "score-under";
  if (score.startsWith("+")) return "score-over";
  return "score-even";
}

function statusBadge(status: string) {
  const cls =
    status === "cut"
      ? "badge badge-cut"
      : status === "wd"
      ? "badge badge-wd"
      : status === "dq"
      ? "badge badge-dq"
      : status === "finished"
      ? "badge badge-finished"
      : "badge badge-active";

  const label = status === "active" ? "LIVE" : status.toUpperCase();
  return <span className={cls}>{label}</span>;
}

function posDisplay(pos: number | null, isTied: boolean): string {
  if (pos === null) return "—";
  return (isTied ? "T" : "") + pos;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntrant, setExpandedEntrant] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/standings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Masters Pool 2026</div>
          <div className="text-[var(--muted)] pulse">Loading live data...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Masters Pool 2026
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Live tracking dashboard
          </p>
        </div>
        <div className="update-bar">
          <span>
            Leaderboard: {formatTime(data?.leaderboardUpdated ?? null)}
          </span>
          <span>Odds: {formatTime(data?.oddsUpdated ?? null)}</span>
        </div>
      </div>

      {/* Errors / Warnings */}
      {(error || (data?.errors?.length ?? 0) > 0) && (
        <div className="text-xs text-[var(--yellow)] bg-[rgba(210,153,34,0.1)] border border-[var(--yellow)] rounded px-3 py-2 space-y-1">
          {error && <div>Fetch error: {error}</div>}
          {data?.errors?.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Pool Standings */}
          <section className="card">
            <div className="card-header">Pool Standings</div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Entrant</th>
                    <th>Golfers</th>
                    <th className="text-right">Current $</th>
                    <th className="text-right">Expected $</th>
                  </tr>
                </thead>
                <tbody>
                  {data.standings.map((s) => (
                    <tr
                      key={s.name}
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedEntrant(
                          expandedEntrant === s.name ? null : s.name
                        )
                      }
                    >
                      <td className="font-bold text-[var(--muted)]">
                        {s.rank}
                      </td>
                      <td className="font-semibold">{s.name}</td>
                      <td className="text-sm text-[var(--muted)]">
                        {s.golfers.map((g) => g.name).join(", ")}
                      </td>
                      <td className="text-right money money-positive">
                        {formatMoney(s.currentDollars)}
                      </td>
                      <td className="text-right money text-[var(--blue)]">
                        {formatMoney(s.expectedDollars)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded entrant detail */}
            {expandedEntrant && data.standings.find(s => s.name === expandedEntrant) && (
              <div className="border-t border-[var(--border)] bg-[rgba(22,27,34,0.7)] p-3">
                <div className="text-sm font-semibold mb-2 text-[var(--blue)]">
                  {expandedEntrant} — Golfer Details
                </div>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Golfer</th>
                        <th className="text-center">Pos</th>
                        <th className="text-center">Score</th>
                        <th className="text-center">Thru</th>
                        <th className="text-center">Status</th>
                        <th className="text-right">Current $</th>
                        <th className="text-right">Expected $</th>
                        <th className="text-right">Odds</th>
                        <th className="text-right">Win %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.standings
                        .find((s) => s.name === expandedEntrant)!
                        .golfers.map((g) => (
                          <tr
                            key={g.name}
                            className={
                              ["cut", "wd", "dq"].includes(g.status)
                                ? "opacity-50"
                                : ""
                            }
                          >
                            <td className="font-medium">{g.name}</td>
                            <td className="text-center">
                              {posDisplay(g.position, g.isTied)}
                            </td>
                            <td
                              className={`text-center ${scoreClass(g.score)}`}
                            >
                              {g.score}
                            </td>
                            <td className="text-center">{g.thru}</td>
                            <td className="text-center">
                              {statusBadge(g.status)}
                            </td>
                            <td className="text-right money money-positive">
                              {formatMoney(g.currentDollars)}
                            </td>
                            <td className="text-right money text-[var(--blue)]">
                              {formatMoney(g.expectedDollars)}
                            </td>
                            <td className="text-right text-[var(--muted)]">
                              {formatOdds(g.odds)}
                            </td>
                            <td className="text-right text-[var(--muted)]">
                              {formatPct(g.winProbability)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="px-4 py-2 text-xs text-[var(--muted)] border-t border-[var(--border)]">
              Current $ = if tournament ended now. Expected $ ={" "}
              {data.players[0]?.evMethod || "estimated from live odds"}. Click a
              row to expand golfer details.
            </div>
          </section>

          {/* All Rostered Players */}
          <section className="card">
            <div className="card-header">All Rostered Players</div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Golfer</th>
                    <th className="text-center">Pos</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Today</th>
                    <th className="text-center">Thru</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Rostered</th>
                    <th className="text-right">Current $</th>
                    <th className="text-right">Expected $</th>
                    <th className="text-right">Odds</th>
                    <th className="text-right">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.players.map((p) => (
                    <tr
                      key={p.name}
                      className={
                        ["cut", "wd", "dq"].includes(p.status)
                          ? "opacity-50"
                          : ""
                      }
                    >
                      <td className="font-medium">{p.name}</td>
                      <td className="text-center">
                        {posDisplay(p.position, p.isTied)}
                      </td>
                      <td className={`text-center ${scoreClass(p.score)}`}>
                        {p.score}
                      </td>
                      <td className={`text-center ${scoreClass(p.today)}`}>
                        {p.today}
                      </td>
                      <td className="text-center">{p.thru}</td>
                      <td className="text-center">{statusBadge(p.status)}</td>
                      <td className="text-center text-[var(--muted)]">
                        {p.selectedByCount}x
                      </td>
                      <td className="text-right money money-positive">
                        {formatMoney(p.currentDollars)}
                      </td>
                      <td className="text-right money text-[var(--blue)]">
                        {formatMoney(p.expectedDollars)}
                      </td>
                      <td className="text-right text-[var(--muted)]">
                        {formatOdds(p.odds)}
                      </td>
                      <td className="text-right text-[var(--muted)]">
                        {formatPct(p.winProbability)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-[var(--muted)] py-4">
        Auto-refreshes every 30s. Data sources: ESPN (leaderboard), The Odds API
        (odds). Payout estimates based on projected 2026 Masters purse.
      </footer>
    </main>
  );
}
