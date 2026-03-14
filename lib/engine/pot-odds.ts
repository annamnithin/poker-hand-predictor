// ============================================================
// POT ODDS — Fundamental poker math utilities
// ============================================================

/**
 * Calculate pot odds as a percentage.
 * pot odds = amountToCall / (pot + amountToCall)
 *
 * Example: pot is 100, call is 50 → 50/150 = 33.3%
 * Meaning hero needs >33.3% equity to profitably call.
 */
export function calculatePotOdds(potSize: number, amountToCall: number): number {
  if (amountToCall <= 0) return 0;
  return (amountToCall / (potSize + amountToCall)) * 100;
}

/**
 * Calculate the pot odds offered by a raise (the implied new pot).
 * Used to evaluate what equity villain needs to continue.
 */
export function calculateRaisePotOdds(
  potSize: number,
  raiseSize: number,
  amountToCall: number
): number {
  const villainCallAmount = raiseSize - amountToCall;
  const newPot = potSize + raiseSize + amountToCall;
  if (villainCallAmount <= 0) return 0;
  return (villainCallAmount / (newPot + villainCallAmount)) * 100;
}

/**
 * Calculate the minimum equity needed to call profitably.
 */
export function minimumEquityToCall(potSize: number, amountToCall: number): number {
  return calculatePotOdds(potSize, amountToCall);
}

/**
 * Stack-to-pot ratio (SPR).
 * Low SPR (< 3) = committed, High SPR (> 10) = deep play.
 */
export function stackToPotRatio(effectiveStack: number, potSize: number): number {
  if (potSize <= 0) return Infinity;
  return effectiveStack / potSize;
}
