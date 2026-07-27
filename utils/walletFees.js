// Mirrors backend/services/walletFees.js — used only for the live preview
// as the user types a withdrawal amount. The server always recomputes this
// independently before debiting anything; this copy never has to be trusted.
export const MIN_WITHDRAWAL_KES = 300;
export const SERVICE_FEE_KES = 100;
export const TAX_PCT = 0.03;

export function computeWithdrawalBreakdown(amount) {
  const tax = Math.round(amount * TAX_PCT);
  const netPayout = amount - SERVICE_FEE_KES - tax;
  return { amount, serviceFee: SERVICE_FEE_KES, tax, netPayout };
}
