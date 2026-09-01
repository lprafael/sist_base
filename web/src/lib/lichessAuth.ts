/**
 * Utilidades para autenticación OAuth2 PKCE con Lichess.org
 */

export function generateCodeVerifier(length = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function createLichessAuthUrl(redirectUri?: string, clientId = 'micancha'): Promise<{ authUrl: string; verifier: string }> {
  const finalRedirectUri = redirectUri || `${window.location.origin}/auth/lichess/callback`;
  const verifier = generateCodeVerifier(64);
  const challenge = await generateCodeChallenge(verifier);
  const state = generateCodeVerifier(16);

  sessionStorage.setItem('lichess_oauth_verifier', verifier);
  sessionStorage.setItem('lichess_oauth_state', state);
  sessionStorage.setItem('lichess_oauth_redirect_uri', finalRedirectUri);

  const authUrl = `https://lichess.org/oauth?response_type=code&client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&code_challenge=${encodeURIComponent(
    challenge
  )}&code_challenge_method=S256&state=${encodeURIComponent(state)}&scope=preference:read`;

  return { authUrl, verifier };
}
