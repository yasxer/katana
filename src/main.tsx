import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/jetbrains-mono';
import './styles/base.css';
import { App } from './App';
import { trackViewport } from './lib/viewport';
import { ScrollProvider } from './scroll/ScrollProvider';
import { KatanaProvider } from './three/KatanaProvider';
import './styles/responsive.css';

trackViewport();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScrollProvider>
      <KatanaProvider>
        <App />
      </KatanaProvider>
    </ScrollProvider>
  </StrictMode>
);
