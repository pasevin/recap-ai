// Shared utility functions for Recap AI
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isValidTimeframe(timeframe: string): boolean {
  const validTimeframes = ['1d', '1w', '1m', '1y'];
  return validTimeframes.includes(timeframe);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
