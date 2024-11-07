// SnackbarContext.js
import React, { createContext, ReactNode, SyntheticEvent, useState } from 'react';
import Snackbar, { SnackbarCloseReason } from '@mui/material/Snackbar';
import Alert, { AlertColor } from '@mui/material/Alert';

export const SnackbarContext = createContext<SnackbarContextProps | undefined>(undefined);


interface SnackbarContextProps {
  showSnackbar: (message: string, severity?: AlertColor) => void;
}

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [snackbarState, setSnackbarState] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showSnackbar = (message: string, severity: AlertColor = 'info') => {
    setSnackbarState({
      open: true,
      message,
      severity,
    });
  };

  const handleAlertClose = (event: SyntheticEvent<Element, Event>) => {
    setSnackbarState({ ...snackbarState, open: false });
  };

  const handleSnackbarClose = (
    event: React.SyntheticEvent<any, Event> | Event,
    reason: SnackbarCloseReason
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarState({ ...snackbarState, open: false });
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      {children}
      <Snackbar
        open={snackbarState.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleAlertClose}
          severity={snackbarState.severity}
          sx={{ width: '100%' }}
          elevation={6}
          variant="filled"
        >
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
