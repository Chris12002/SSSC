import React, { useContext, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { SchemaSource, SchemaSourceType, ServerLogonFields } from '../../../shared/types';
import { SnackbarContext } from '../contexts/SnackbarContext';
import LoginModal from './LoginModal';

interface SourceSelectorProps {
  title: string;
  source: SchemaSource | null;
  onSourceChange: (source: SchemaSource | null) => void;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({ title, source, onSourceChange }) => {
  const [sourceType, setSourceType] = useState<SchemaSourceType>(source?.type || 'database');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [localCredentials, setLocalCredentials] = useState<ServerLogonFields | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [folderPath, setFolderPath] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const snackbarContext = useContext(SnackbarContext);
  const { showSnackbar } = snackbarContext!;

  useEffect(() => {
    const loadCredentials = async () => {
      const storedCredentials = await window.api.getStoredCredentials();
      if (storedCredentials) {
        setLocalCredentials(storedCredentials);
      }
    };
    loadCredentials();
  }, []);

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.value as SchemaSourceType;
    setSourceType(newType);
    onSourceChange(null);
    setSelectedDatabase('');
    setFolderPath('');
    setIsConnected(false);
    setDatabases([]);
  };

  const handleConnectDatabase = async () => {
    if (!localCredentials) {
      setIsLoginOpen(true);
      return;
    }
    
    setIsLoading(true);
    try {
      await window.api.setCredentials(localCredentials);
      const dbs = await window.api.getDatabases();
      setDatabases(dbs);
      setIsConnected(true);
    } catch (error) {
      showSnackbar('Failed to connect to database. Please check your credentials.', 'error');
      setIsLoginOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (creds: ServerLogonFields) => {
    if (creds.saveCredentials) {
      await window.api.storeCredentials(creds);
    }
    setLocalCredentials(creds);
    setIsLoginOpen(false);
    
    setIsLoading(true);
    try {
      await window.api.setCredentials(creds);
      const dbs = await window.api.getDatabases();
      setDatabases(dbs);
      setIsConnected(true);
    } catch (error) {
      showSnackbar('Failed to connect to database.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseChange = (dbName: string) => {
    setSelectedDatabase(dbName);
    if (dbName && localCredentials) {
      onSourceChange({
        type: 'database',
        name: `${localCredentials.server}/${dbName}`,
        database: dbName,
        server: localCredentials.server,
        credentials: localCredentials,
      });
    } else {
      onSourceChange(null);
    }
  };

  const handleSelectFolder = async () => {
    const result = await window.api.selectFolder(`Select ${title} Scripts Folder`);
    if (!result.canceled && result.folderPath) {
      setFolderPath(result.folderPath);
      const folderName = result.folderPath.split(/[/\\]/).pop() || result.folderPath;
      onSourceChange({
        type: 'folder',
        name: folderName,
        folderPath: result.folderPath,
      });
    }
  };

  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>

        <FormControl component="fieldset" sx={{ mb: 2 }}>
          <RadioGroup row value={sourceType} onChange={handleTypeChange}>
            <FormControlLabel value="database" control={<Radio />} label="Database" />
            <FormControlLabel value="folder" control={<Radio />} label="Scripts Folder" />
          </RadioGroup>
        </FormControl>

        {sourceType === 'database' && (
          <Box>
            {!isConnected ? (
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {localCredentials 
                    ? `Server: ${localCredentials.server}` 
                    : 'No credentials configured'}
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={handleConnectDatabase}
                  disabled={isLoading}
                  sx={{ mr: 1 }}
                >
                  {isLoading ? 'Connecting...' : 'Connect'}
                </Button>
                <Button 
                  variant="text" 
                  onClick={() => setIsLoginOpen(true)}
                  disabled={isLoading}
                >
                  Change Credentials
                </Button>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
                  Connected to: {localCredentials?.server}
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Database</InputLabel>
                  <Select
                    value={selectedDatabase}
                    label="Database"
                    onChange={(e) => handleDatabaseChange(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Select a database</em>
                    </MenuItem>
                    {databases.map((db) => (
                      <MenuItem key={db} value={db}>
                        {db}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button 
                  variant="text" 
                  size="small"
                  onClick={() => {
                    setIsConnected(false);
                    setSelectedDatabase('');
                    setDatabases([]);
                    onSourceChange(null);
                  }}
                >
                  Disconnect
                </Button>
              </Box>
            )}
          </Box>
        )}

        {sourceType === 'folder' && (
          <Box>
            <TextField
              fullWidth
              label="Folder Path"
              value={folderPath}
              InputProps={{ readOnly: true }}
              placeholder="No folder selected"
              sx={{ mb: 2 }}
            />
            <Button variant="outlined" onClick={handleSelectFolder}>
              Browse...
            </Button>
          </Box>
        )}

        {source && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: 'success.contrastText' }}>
              Selected: {source.name}
            </Typography>
          </Box>
        )}

        <LoginModal
          open={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
          onSubmit={handleLoginSubmit}
          initialValues={localCredentials || undefined}
        />
      </CardContent>
    </Card>
  );
};

export default SourceSelector;
