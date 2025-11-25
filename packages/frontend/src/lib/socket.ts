/**
 * Get the WebSocket server URL based on environment
 * In production: Uses NEXT_PUBLIC_SOCKET_URL from environment
 * In development: Uses localhost:3004
 */
export function getSocketUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return '';
  }

  // Use environment variable in production, fallback to localhost for development
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3004';
}
