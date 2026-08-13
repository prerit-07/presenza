import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './lib/SessionContext';
import App from './App';

// Global stylesheets — ported as-is from css/*.css so the visual
// design is unchanged (theme.css is shared by every page; the
// others are page-family-specific, same as their original <link> tags).
import './styles/theme.css';
import './styles/login.css';
import './styles/marketing.css';
import './styles/pricing.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);
