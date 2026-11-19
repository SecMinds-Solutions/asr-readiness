import { SecMinds } from '../design-system';

const { Badge, Logo } = SecMinds;

/** The SecMinds logo with the product name and its Preview badge, linking to the home page of its half. */
export function Brand({ href }: { href: string }) {
  return (
    <a className="app-brand" href={href} aria-label="ASR Compass home">
      <Logo height={28} />
      <span className="h4 app-brand-name">ASR Compass</span>
      <Badge tone="info">Preview</Badge>
    </a>
  );
}
