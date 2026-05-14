import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';

// Automatically route API requests to the live Render backend URL when in production
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
