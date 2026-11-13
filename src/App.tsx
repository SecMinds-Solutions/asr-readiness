import { SecMinds } from './design-system';
import './app.css';

const { Navbar, Logo, Badge, Card } = SecMinds;

export function App() {
  return (
    <div className="sm-root app">
      <Navbar brand={<Logo height={32} />} />
      <main className="app-main">
        <Badge tone="info">In development</Badge>
        <h1 className="h1 app-title">ASR Readiness</h1>
        <p className="body-lg app-lead">
          Move Microsoft Defender Attack Surface Reduction rules from audit to block mode, safely.
        </p>
        <Card title="Coming soon">
          Sign in, get a verdict for every ASR rule based on its audit events, and download a
          suggested Intune policy to review and deploy yourself. Your security data never leaves
          your browser.
        </Card>
      </main>
    </div>
  );
}
