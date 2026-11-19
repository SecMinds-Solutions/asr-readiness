// ADR-0010: the website loads no sign-in code. Everything the website's entry point imports, directly
// or through other modules, is followed here; none of it may be the sign-in library, the Graph client
// or the User record client. Type-only imports are erased at build time and are not followed.

/** Every source file of the app, by its path from the repository root, such as `/src/main.tsx`. */
const SOURCES = import.meta.glob<string>(['/src/**/*.ts', '/src/**/*.tsx'], { query: '?raw', import: 'default', eager: true });

/** Modules the website must never load. */
const FORBIDDEN_PACKAGES = ['@azure/msal-browser'];
const FORBIDDEN_FILES = [/^\/src\/auth\/msalAuthClient\.ts$/, /^\/src\/auth\/useAuth\.ts$/, /^\/src\/auth\/user\.ts$/, /^\/src\/graph\//, /^\/src\/user-record\//];

const IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/gm;

/** The path `specifier` names from `from`, both from the repository root. */
function join(from: string, specifier: string): string {
  const parts = from.split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}

function resolveFile(from: string, specifier: string): string | null {
  const base = join(from, specifier);
  if (/\.(css|js|json)$/.test(base)) return null;
  const found = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => candidate in SOURCES);
  if (!found) throw new Error(`Cannot resolve ${specifier} from ${from}`);
  return found;
}

function moduleGraph(entry: string) {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (files.has(file)) continue;
    files.add(file);
    for (const match of (SOURCES[file] as string).matchAll(IMPORT)) {
      const specifier = (match[1] ?? match[2]) as string;
      if (!specifier.startsWith('.')) {
        packages.add(specifier);
        continue;
      }
      const resolved = resolveFile(file, specifier);
      if (resolved) queue.push(resolved);
    }
  }
  return { files: [...files], packages: [...packages] };
}

describe('the website', () => {
  const { files, packages } = moduleGraph('/src/website/mount.tsx');

  it('follows the imports of the website (sanity check of this test)', () => {
    expect(files).toContain('/src/website/Landing.tsx');
    expect(files).toContain('/src/components/Footer.tsx');
    expect(packages).toContain('react');
  });

  it('does not load the sign-in library', () => {
    expect(packages.filter((name) => FORBIDDEN_PACKAGES.some((forbidden) => name.startsWith(forbidden)))).toEqual([]);
  });

  it('does not load the sign-in client, the Graph client or the User record client', () => {
    expect(files.filter((file) => FORBIDDEN_FILES.some((pattern) => pattern.test(file)))).toEqual([]);
  });

  it('would catch the app entry point, which does load them', () => {
    const app = moduleGraph('/src/appMount.tsx');
    expect(app.packages).toContain('@azure/msal-browser');
    expect(app.files.some((file) => file.startsWith('/src/user-record/'))).toBe(true);
  });
});
