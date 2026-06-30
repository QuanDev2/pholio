let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(t: string | null) {
  accessToken = t;
}
