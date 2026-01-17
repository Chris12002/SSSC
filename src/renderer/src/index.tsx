// src/renderer.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { SnackbarProvider } from './contexts/SnackbarContext';

//import './styles.css'; // Optional CSS file
const container = document.getElementById('root');
const root = createRoot(container!); 
root.render(
  <SnackbarProvider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </SnackbarProvider>
);