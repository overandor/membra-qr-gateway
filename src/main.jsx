import React from 'react';
import ReactDOM from 'react-dom/client';
import SolanaWalletProvider from './context/WalletContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <SolanaWalletProvider>
      <App />
    </SolanaWalletProvider>
  </ErrorBoundary>,
);
