import { formatCurrency as formatCurrencyUtil } from './formatting';

// Utility function for formatting employee hourly rates
export function formatCurrency(amount?: number): string {
  if (amount === null || amount === undefined) {
    return 'Not set';
  }
  return `${formatCurrencyUtil(amount, true)}/hr`;
}