import { readAuthConfig } from './config';

const clientId = '0b5c3a1e-7d2f-4c8a-9e6b-1f2a3b4c5d6e';

describe('readAuthConfig', () => {
  it('uses the client ID from the build and the page origin as redirect URI', () => {
    expect(readAuthConfig({ VITE_ENTRA_CLIENT_ID: clientId }, 'https://asr.example.com')).toEqual({
      clientId,
      redirectUri: 'https://asr.example.com/',
    });
  });

  it('trims whitespace around the client ID', () => {
    expect(readAuthConfig({ VITE_ENTRA_CLIENT_ID: ` ${clientId}\n` }, 'http://localhost:5173')?.clientId).toBe(clientId);
  });

  it('returns null when no client ID is configured', () => {
    expect(readAuthConfig({}, 'https://asr.example.com')).toBeNull();
    expect(readAuthConfig({ VITE_ENTRA_CLIENT_ID: '' }, 'https://asr.example.com')).toBeNull();
  });

  it('returns null when the client ID is not a GUID', () => {
    expect(readAuthConfig({ VITE_ENTRA_CLIENT_ID: 'not-a-guid' }, 'https://asr.example.com')).toBeNull();
  });
});
