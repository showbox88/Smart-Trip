import './styles/index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from './context/I18nContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './theme';
import App from './App';
import { loadGoogleMaps } from './utils/googleMapsLoader';
import { loadAmap } from './utils/amapLoader';
import { isAmap } from './providers/mapProvider';

// 按设备偏好二选一加载地图 SDK(不同时加载两套)
if (isAmap()) {
  loadAmap();
} else {
  loadGoogleMaps();
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <I18nProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </I18nProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
