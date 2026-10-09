import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Fonts are bundled with the app (not fetched from Google): works offline,
// loads faster, and visitors' IP addresses aren't sent to a third party.
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import App from './App.jsx';
import './theme.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Keep the installed app current. A home-screen app on a phone can stay
// suspended in memory for days and never reload, so without this it keeps
// running whatever version it first loaded. Check for a new version on
// launch, every time the app returns to the foreground, and hourly. When
// one is found it installs and the app reloads itself (registerType is
// 'autoUpdate').
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const check = () => registration.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, 60 * 60 * 1000);
  },
});
