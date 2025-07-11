// Utility function for formatting currency
export function formatCurrency(amount?: number): string {
  if (amount === null || amount === undefined) {
    return 'Not set';
  }
  return `$${amount.toFixed(2)}/hr`;
}