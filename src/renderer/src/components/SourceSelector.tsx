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
  Paper,
  Stack,
  Chip,
  InputAdornment,
  useTheme,
  alpha
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DnsIcon from '@mui/icons-material/Dns';
import { SchemaSource, SchemaSourceType, ServerLogonFields } from '../../../shared/types';
import { SnackbarContext } from '../contexts/SnackbarContext';
import LoginModal from './LoginModal';

interface SourceSelectorProps {
  title: string;
  sourceId: string;
  source: SchemaSource | null;
  onSourceChange: (source: SchemaSource | null) => void;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({ title, sourceId, source, onSourceChange }) => {
  const theme = useTheme();
  const [sourceType, setSourceType] = useState<SchemaSourceType>(source?.type || 'database');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [localCredentials, setLocalCredentials] = useState<ServerLogonFields | null>(null);
  const [storedCredentials, setStoredCredentials] = useState<ServerLogonFields | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [folderPath, setFolderPath] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const databaseLabel = localCredentials
    ? `Database (${localCredentials.username}@${localCredentials.server})`
    : 'Database';

  const snackbarContext = useContext(SnackbarContext);
  const { showSnackbar } = snackbarContext!;

  useEffect(() => {
    const loadCredentials = async () => {
      const stored = await window.api.getStoredCredentials(sourceId);
      if (stored) {
        setLocalCredentials(stored);
        setStoredCredentials(stored);
      }
    };
    loadCredentials();
  }, [sourceId]);

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
      await window.api.setCredentials(sourceId, localCredentials);
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
    const credentialsWithSource = { ...creds, sourceId };
    if (creds.saveCredentials) {
      await window.api.storeCredentials(sourceId, credentialsWithSource);
      setStoredCredentials({ ...credentialsWithSource, password: undefined });
    } else {
      await window.api.clearStoredCredentials(sourceId);
      setStoredCredentials(null);
    }
    setLocalCredentials(credentialsWithSource);
    setIsLoginOpen(false);

    setIsLoading(true);
    try {
      await window.api.setCredentials(sourceId, credentialsWithSource);
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
        credentials: { ...localCredentials, sourceId },
      });
    } else {
      onSourceChange(null);
    }
  };

  const handleClearStoredCredentials = async () => {
    await window.api.clearStoredCredentials(sourceId);
    setStoredCredentials(null);
    if (localCredentials) {
      setLocalCredentials({ ...localCredentials, credentialId: undefined, saveCredentials: false });
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
    <Card 
      elevation={0} 
      sx={{ 
        height: '100%', 
        border: '1px solid', 
        borderColor: source ? 'primary.main' : 'divider',
        transition: 'border-color 0.2s',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {title}
        </Typography>
        {source && (
          <Chip 
            icon={<CheckCircleIcon />} 
            label="Ready" 
            size="small" 
            color="success" 
            variant="outlined" 
          />
        )}
      </Box>

      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <FormControl component="fieldset">
          <RadioGroup row value={sourceType} onChange={handleTypeChange}>
            <FormControlLabel 
              value="database" 
              control={<Radio />} 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <StorageIcon fontSize="small" color={sourceType === 'database' ? 'primary' : 'disabled'} />
                  <Typography variant="body2">Database</Typography>
                </Box>
              } 
              sx={{ mr: 4 }}
            />
            <FormControlLabel 
              value="folder" 
              control={<Radio />} 
              label={
                 <Box display="flex" alignItems="center" gap={1}>
                  <FolderIcon fontSize="small" color={sourceType === 'folder' ? 'primary' : 'disabled'} />
                  <Typography variant="body2">Scripts Folder</Typography>
                </Box>
              } 
            />
          </RadioGroup>
        </FormControl>

        {sourceType === 'database' && (
          <Stack spacing={2}>
            {!isConnected ? (
              <Box p={2} borderRadius={2} bgcolor="background.default" border="1px dashed" borderColor="divider">
                <Box display="flex" flexDirection="column" gap={2} alignItems="center" justifyContent="center" py={2}>
                  <DnsIcon color="action" sx={{ fontSize: 40, opacity: 0.5 }} />
                  <Box textAlign="center">
                    <Typography variant="body2" fontWeight="600" gutterBottom>
                      {localCredentials ? localCredentials.server : 'No Server Configured'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {localCredentials ? `User: ${localCredentials.username}` : 'Connect to a database server to select a schema'}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button 
                      variant="contained" 
                      onClick={handleConnectDatabase}
                      disabled={isLoading}
                      size="small"
                    >
                      {isLoading ? 'Connecting...' : 'Connect'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={() => setIsLoginOpen(true)}
                      disabled={isLoading}
                      size="small"
                    >
                      Configure
                    </Button>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Stack spacing={2}>
                <Box display="flex" alignItems="center" justifyContent="space-between" bgcolor="success.light" p={1.5} borderRadius={1} sx={{ bgOpacity: 0.1 }}>
                  <Typography variant="body2" color="success.dark" fontWeight="500">
                     Connected: {localCredentials?.server}
                  </Typography>
                  <Button 
                    size="small" 
                    color="inherit" 
                    onClick={() => {
                      setIsConnected(false);
                      setSelectedDatabase('');
                      setDatabases([]);
                      onSourceChange(null);
                    }}
                    sx={{ minWidth: 'auto' }}
                  >
                    Disconnect
                  </Button>
                </Box>

                <FormControl fullWidth size="medium">
                  <InputLabel>{databaseLabel}</InputLabel>
                  <Select
                    value={selectedDatabase}
                    label={databaseLabel}
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
              </Stack>
            )}

            {storedCredentials?.saveCredentials && (
              <Button
                variant="text"
                size="small"
                color="error"
                onClick={handleClearStoredCredentials}
                disabled={isLoading}
                sx={{ alignSelf: 'flex-start' }}
              >
                Clear Saved Credentials
              </Button>
            )}
          </Stack>
        )}

        {sourceType === 'folder' && (
          <Box>
             <TextField
              fullWidth
              label="Folder Path"
              value={folderPath}
              InputProps={{ 
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <FolderIcon color="action" />
                  </InputAdornment>
                )
              }}
              placeholder="No folder selected"
              sx={{ mb: 2 }}
              onClick={handleSelectFolder}
            />
            <Button variant="outlined" fullWidth onClick={handleSelectFolder}>
              Browse Folder...
            </Button>
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
