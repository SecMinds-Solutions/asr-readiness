import staticWebAppConfig from '../public/staticwebapp.config.json?raw';

const config = JSON.parse(staticWebAppConfig) as { globalHeaders: { 'Content-Security-Policy': string } };
const directives = new Map(
  config.globalHeaders['Content-Security-Policy'].split(';').map((directive) => {
    const [name = '', ...sources] = directive.trim().split(/\s+/);
    return [name, sources] as const;
  }),
);

describe('Content-Security-Policy', () => {
  it('allows connections only to the app itself and the Microsoft identity platform', () => {
    expect(directives.get('connect-src')).toEqual(["'self'", 'https://login.microsoftonline.com']);
  });

  it('allows scripts only from the app itself', () => {
    expect(directives.get('script-src')).toEqual(["'self'"]);
    expect(directives.get('default-src')).toEqual(["'self'"]);
  });
});
