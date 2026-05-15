import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Configure Axios base URL for production
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
