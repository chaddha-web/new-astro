import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

import BezarCheckout from './BezarCheckout';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isBezarCheckout = new URLSearchParams(window.location.search).get('bezar_checkout') === 'true';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isBezarCheckout ? (
      <BezarCheckout />
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>
);