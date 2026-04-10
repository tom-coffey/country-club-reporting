import payoutData from "@/config/payouts_masters_2026.json";

const payoutTable: Record<string, number> = payoutData.payouts;

/**
 * Convert American odds to implied probability.
 */
export function oddsToImpliedProbability(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

/**
 * MVP heuristic for expected dollars.
 *
 * Uses win probability from odds plus current position to build
 * a rough finish distribution. This is explicitly a heuristic —
 * real expected value requires full finish-position probabilities.
 *
 * Approach:
 * - Win prob comes from odds
 * - We spread remaining probability across nearby positions
 *   weighted toward current position
 * - Multiply each position's probability by its payout
 */
export function calculateExpectedDollars(
  currentPosition: number | null,
  odds: number | null,
  status: string
): { expectedDollars: number; winProbability: number | null; method: string } {
  // No expected value for eliminated players
  if (["cut", "wd", "dq"].includes(status)) {
    return { expectedDollars: 0, winProbability: null, method: "eliminated" };
  }

  // If no odds available, use current position payout as rough estimate
  if (odds === null || currentPosition === null) {
    if (currentPosition !== null) {
      const payout = payoutTable[String(currentPosition)] || 0;
      return {
        expectedDollars: payout,
        winProbability: null,
        method: "current position only (no odds)",
      };
    }
    return { expectedDollars: 0, winProbability: null, method: "no data" };
  }

  const winProb = oddsToImpliedProbability(odds);

  // Build a simple finish distribution
  // Allocate win probability to position 1
  // Distribute remaining probability in a bell curve around current position
  const maxPos = 50;
  const distribution: number[] = new Array(maxPos + 1).fill(0);

  // Win probability
  distribution[1] = winProb;

  // Remaining probability spread around current position
  const remaining = 1 - winProb;
  const sigma = Math.max(5, currentPosition * 0.5); // spread

  let totalWeight = 0;
  const weights: number[] = new Array(maxPos + 1).fill(0);

  for (let pos = 1; pos <= maxPos; pos++) {
    if (pos === 1) continue; // already allocated win prob
    const dist = Math.abs(pos - currentPosition);
    const w = Math.exp((-dist * dist) / (2 * sigma * sigma));
    weights[pos] = w;
    totalWeight += w;
  }

  if (totalWeight > 0) {
    for (let pos = 2; pos <= maxPos; pos++) {
      distribution[pos] = remaining * (weights[pos] / totalWeight);
    }
  }

  // Calculate expected dollars
  let expectedDollars = 0;
  for (let pos = 1; pos <= maxPos; pos++) {
    const payout = payoutTable[String(pos)] || 0;
    expectedDollars += distribution[pos] * payout;
  }

  return {
    expectedDollars: Math.round(expectedDollars),
    winProbability: winProb,
    method: "estimated from live odds",
  };
}
