import React, { useState, useEffect } from 'react';
import {ServerLogonFields} from '../../../shared/types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (credentials: ServerLogonFields) => void;
  initialValues?: ServerLogonFields;
}

const PLACEHOLDER_PASSWORD = '********';

const LoginModal: React.FC<LoginModalProps> = ({ open, onClose, onSubmit, initialValues }) => {
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setServer(initialValues.server);
      setUsername(initialValues.username);
      setPassword(PLACEHOLDER_PASSWORD);
      setSaveCredentials(initialValues.saveCredentials);
    } else {
      setServer('');
      setUsername('');
      setPassword('');
      setSaveCredentials(false);
    }
    setPasswordChanged(false);
  }, [initialValues, open]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordChanged(true);
  };

  const handleSubmit = () => {
    const creds: ServerLogonFields = {
      server,
      username,
      // Use the new password if changed; otherwise, indicate to use the stored password
      password: passwordChanged ? password : undefined,
      saveCredentials,
    };
    onSubmit(creds);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Enter Server Credentials</DialogTitle>
      <DialogContent>
        <TextField
          label="Server Address"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Password"
          value={password}
          onChange={handlePasswordChange}
          type="password"
          fullWidth
          margin="normal"
          autoComplete="new-password"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={saveCredentials}
              onChange={(e) => setSaveCredentials(e.target.checked)}
              color="primary"
            />
          }
          label="Remember Credentials"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Connect
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginModal;
