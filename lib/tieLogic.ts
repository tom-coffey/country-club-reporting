import payoutData from "@/config/payouts_masters_2026.json";

const payoutTable: Record<string, number> = payoutData.payouts;
const maxPayoutPosition = Math.max(
  ...Object.keys(payoutTable).map(Number)
);

export interface PlayerPosition {
  name: string;
  position: number; // 1-based position (T5 = 5)
  isTied: boolean;
  tiedCount: number; // how many players share this position
  status: string; // "active" | "cut" | "wd" | "dq" | "finished"
  isAmateur: boolean;
}

/**
 * Calculate payout for a player given their position and tie info.
 * If tied, averages the payouts across all tied positions.
 */
export function calculatePayout(player: PlayerPosition): number {
  // No payout for cut/wd/dq or amateurs
  if (["cut", "wd", "dq"].includes(player.status)) return 0;
  if (player.isAmateur) return 0;

  const pos = player.position;
  if (pos > maxPayoutPosition) return 0;

  if (!player.isTied || player.tiedCount <= 1) {
    return payoutTable[String(pos)] || 0;
  }

  // Tie averaging: sum payouts for positions pos through pos+tiedCount-1
  let totalPayout = 0;
  for (let i = 0; i < player.tiedCount; i++) {
    const p = pos + i;
    if (p <= maxPayoutPosition) {
      totalPayout += payoutTable[String(p)] || 0;
    }
  }

  return Math.round(totalPayout / player.tiedCount);
}

/**
 * Given an array of positions (sorted), compute tie groups.
 * Returns a map of position -> count of players at that position.
 */
export function computeTieGroups(
  positions: number[]
): Map<number, number> {
  const groups = new Map<number, number>();
  for (const pos of positions) {
    groups.set(pos, (groups.get(pos) || 0) + 1);
  }
  return groups;
}
