// Base URL for all API calls.
// Set VITE_API_URL as a Railway environment variable only when the client
// and server are deployed as separate services. In production (same domain),
// leave it unset — the empty string means requests go to the same origin.
export const BASE_URL = import.meta.env.VITE_API_URL || '';
