// src/renderer.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import { SnackbarProvider } from './contexts/SnackbarContext';

//import './styles.css'; // Optional CSS file
const container = document.getElementById('root');
const root = createRoot(container!); 
root.render(
  <SnackbarProvider>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </SnackbarProvider>
);