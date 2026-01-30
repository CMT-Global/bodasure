/**
 * Generates a unique QR code string for riders.
 * Format: BS + 12 hex chars (e.g. BS1A2B3C4D5E6) - URL-safe, scannable.
 */
export function generateRiderQRCode(): string {
  const uuid = crypto.randomUUID().replace(/-/g, '');
  return `BS${uuid.slice(0, 12).toUpperCase()}`;
}
