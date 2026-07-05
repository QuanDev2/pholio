import axios from "axios";
import { getAccessToken, setAccessToken } from "./authToken";

/**
 * Shared axios instance for the API. The request interceptor stamps the access
 * token on every call; the response interceptor transparently refreshes an
 * expired token and replays the failed request.
 *
 * Concurrent-refresh handling
 * ---------------------------
 * When the access token expires, several in-flight requests can 401 at the same
 * moment. Naively each one would fire its own POST /auth/refresh — but refresh
 * *rotates* the token (the old one is deleted), so refreshes 2..N would present
 * an already-invalidated token and could nuke the session.
 *
 * Instead we elect a single "leader":
 *   - The first 401 flips `isRefreshing` and performs the one refresh.
 *   - Every later 401 while a refresh is in flight parks itself: it returns a
 *     pending Promise and stashes that Promise's resolve/reject handles in
 *     `queue`, then waits.
 *   - When the leader finishes it drains the queue — resolving each waiter on
 *     success (they retry with the fresh token) or rejecting on failure (they
 *     fail cleanly instead of retrying a dead token).
 *
 * `_retry` on the request config guards against a refresh loop: a request is
 * only refreshed once. The refresh call itself uses bare `axios` (not `api`) so
 * it bypasses this interceptor entirely and can never trigger the loop.
 */
export const api = axios.create({
  baseURL: "http://localhost:4000/api/v1",
  withCredentials: true,
});

// Refresh coordination state — module-level so every interceptor invocation
// shares the same slots (a local would give each concurrent 401 its own copy).
let isRefreshing = false; // is a refresh already in flight?
// Parked requests: each holds the resolve/reject handles of its pending Promise,
// pressed by the leader once the refresh settles.
let queue: { resolve: (value?: unknown) => void; reject: (error: unknown) => void }[] = [];

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response, // success path, pass thru untouched
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // mark so a request is refreshed at most once

      // A refresh is already underway — park behind it instead of starting a
      // second one. Retry once our handle is resolved by the leader below.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      // This request is the leader: it owns the single refresh.
      isRefreshing = true;
      try {
        // Bare `axios` (not `api`) so this call skips the interceptor and can't
        // recurse into another refresh.
        const res = await axios.post(
          "http://localhost:4000/api/v1/auth/refresh",
          {},
          { withCredentials: true },
        );
        setAccessToken(res.data.token); // set before waking waiters, so their
        queue.forEach(({ resolve }) => resolve()); // retries carry the new token
        queue = [];

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (session truly gone) — fail every waiter so they
        // reject rather than retry against a dead token.
        queue.forEach(({ reject }) => reject(refreshError));
        queue = [];

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // always clear the flag, success or failure
      }
    }
    return Promise.reject(error);
  },
);
