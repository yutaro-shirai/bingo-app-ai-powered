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
  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!url && process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    console.error('Error: NEXT_PUBLIC_SOCKET_URL is not defined. Socket connection will likely fail.');
  }
  return url || 'http://localhost:3004';
}
