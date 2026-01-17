// src/renderer.tsx

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { ColorModeProvider, useColorMode } from './contexts/ColorModeContext';

const ThemeWrapper: React.FC = () => {
  const { mode } = useColorMode();
  const theme = React.useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

//import './styles.css'; // Optional CSS file
const container = document.getElementById('root');
const root = createRoot(container!); 
root.render(
  <ColorModeProvider>
    <SnackbarProvider>
      <ThemeWrapper />
    </SnackbarProvider>
  </ColorModeProvider>
);
