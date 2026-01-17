import React, { useContext, useEffect, useMemo, useState } from 'react';
import ProcedureSelector from './ProcedureSelector';
import SnapshotSelector from './SnapshotSelector';
import DiffViewer from './DiffViewer';
import { generateDiffHtml } from '../../../main/utils/diff';
import { Box, Button, Container, Typography, Paper, IconButton, useTheme, alpha } from '@mui/material';
import Grid from '@mui/material/Grid2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HistoryIcon from '@mui/icons-material/History';
import SaveIcon from '@mui/icons-material/Save';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { generateFileName, prepareHtmlContent } from '../../../main/utils/export';
import { SnackbarContext } from '../contexts/SnackbarContext';
import LoginModal from './LoginModal';
import { DiffItem, ServerLogonFields } from '../../../shared/types';
import DatabaseSelector from './DatabaseSelector';
import ThemeToggle from './ThemeToggle';

interface HistoryCompareProps {
  onBack: () => void;
}

const HistoryCompare: React.FC<HistoryCompareProps> = ({ onBack }) => {
  const theme = useTheme();
  const SOURCE_ID = 'history';
  const [procedures, setProcedures] = useState<string[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshot1Id, setSnapshot1Id] = useState<number | null>(null);
  const [snapshot2Id, setSnapshot2Id] = useState<number | null>(null);
  const [snapshot1Data, setSnapshot1Data] = useState<string>('');
  const [snapshot2Data, setSnapshot2Data] = useState<string>('');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [credentials, setCredentials] = useState<ServerLogonFields | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const databaseLabel = credentials
    ? `Database (${credentials.username}@${credentials.server})`
    : 'Select Database';

  const snackbarContext = useContext(SnackbarContext);
  const { showSnackbar } = snackbarContext!;

  useEffect(() => {
    const fetchCredentials = async () => {
      const storedCredentials = await window.api.getStoredCredentials(SOURCE_ID);
      if (storedCredentials) {
        await setDatabaseCredentials(storedCredentials);
        await fetchDatabases();
      } else {
        setIsLoginOpen(true);
      }
    };
    fetchCredentials();
  }, []);

  const generateCombinedDiff = () => {
    return diffs.map((diff) => diff.content).join('<hr />');
  };

  const combinedDiffHtml = useMemo(() => generateCombinedDiff(), [diffs]);

  const removeDiff = (id: string) => {
    setDiffs((prevDiffs) => prevDiffs.filter((diff) => diff.id !== id));
  };

  const handleLoginSubmit = async (creds: ServerLogonFields) => {
    const credentialsWithSource = { ...creds, sourceId: SOURCE_ID };
    if (creds.saveCredentials) {
      await window.api.storeCredentials(SOURCE_ID, credentialsWithSource);
    } else {
      await window.api.clearStoredCredentials(SOURCE_ID);
    }
    await setDatabaseCredentials(credentialsWithSource);
    setIsLoginOpen(false);
    await fetchDatabases();
  };

  const setDatabaseCredentials = async (creds: ServerLogonFields) => {
    await window.api.setCredentials(SOURCE_ID, creds);
    const { password: _password, ...metadata } = creds;
    setCredentials({ ...metadata, sourceId: SOURCE_ID });
  };

  const setDatabase = async (dbName: string | null) => {
    if (dbName) {
      await window.api.updateDatabase(dbName);
    }
    setSelectedDatabase(dbName);
  };

  const handleClearStoredCredentials = async () => {
    await window.api.clearStoredCredentials(SOURCE_ID);
    setCredentials((prev) => (prev ? { ...prev, credentialId: undefined, saveCredentials: false } : null));
    setSelectedDatabase(null);
    setProcedures([]);
    setSnapshots([]);
  };

  const fetchDatabases = async () => {
    try {
      const dbs = await window.api.getDatabases();
      setDatabases(dbs);
    } catch (error) {
      console.error('Error fetching databases:', error);
      showSnackbar('Failed to fetch databases. Please check your credentials.', 'error');
      setIsLoginOpen(true);
    }
  };

  useEffect(() => {
    if (selectedDatabase) {
      const loadProcedures = async () => {
        try {
          const procs = await window.api.getProcedures();
          const sortedProcs = procs.sort((a: string, b: string) => a.localeCompare(b));
          setProcedures(sortedProcs);
          if (procs.length > 0) {
            setSelectedProcedure(procs[0]);
          }
        } catch (err) {
          showSnackbar(`Error retrieving procedures: ${err}`, 'error');
        }
      };
      loadProcedures();
    }
  }, [selectedDatabase]);

  useEffect(() => {
    if (selectedProcedure) {
      const loadSnapshots = async () => {
        const snaps = await window.api.getSnapshots(selectedProcedure);
        setSnapshots(snaps);
        if (snaps.length > 0) {
          setSnapshot1Id(snaps[0].ChangeControlID);
          setSnapshot2Id(snaps[0].ChangeControlID);
        }
      };
      loadSnapshots();
    }
  }, [selectedProcedure]);

  useEffect(() => {
    if (snapshot1Id) {
      setSnapshot1Data('');
    }
  }, [snapshot1Id]);

  useEffect(() => {
    if (snapshot2Id) {
      setSnapshot2Data('');
    }
  }, [snapshot2Id]);

  const compareSnapshots = async () => {
    if (snapshot1Id && snapshot2Id) {
      try {
        let data1 = snapshot1Data;
        let data2 = snapshot2Data;

        const promises: Promise<any>[] = [];

        if (!snapshot1Data) {
          promises.push(
            window.api.getSnapshotData(snapshot1Id).then((data) => {
              data1 = data;
              setSnapshot1Data(data);
            })
          );
        }

        if (!snapshot2Data) {
          promises.push(
            window.api.getSnapshotData(snapshot2Id).then((data) => {
              data2 = data;
              setSnapshot2Data(data);
            })
          );
        }

        await Promise.all(promises);

        if (data1 && data2) {
          const diff: DiffItem = generateDiffHtml(data2, data1, selectedProcedure);
          setDiffs((prevDiffs) => [...prevDiffs, diff]);
        } else {
          showSnackbar('An error occurred while generating the diff.', 'error');
        }
      } catch (err) {
        showSnackbar('An error occurred while generating the diff.', 'error');
      }
    }
  };

  const handleSaveDiff = async () => {
    try {
      const htmlContent = await prepareHtmlContent(combinedDiffHtml);
      const defaultFileName = generateFileName(
        diffs,
        snapshot1Id ? snapshot1Id.toString() : '',
        snapshot2Id ? snapshot2Id.toString() : ''
      );

      const { canceled, filePath } = await window.api.saveDialog(defaultFileName);

      if (canceled) {
        console.log('Save dialog was canceled');
        return;
      }

      if (filePath) {
        window.api.saveHtmlFile(filePath, htmlContent);
        showSnackbar(`File saved successfully at ${filePath}`, 'success');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      showSnackbar('An error occurred while saving the file.', 'error');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <LoginModal
        open={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSubmit={handleLoginSubmit}
        initialValues={credentials || undefined}
      />
      
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          py: 2, 
          px: 4, 
          borderBottom: '1px solid', 
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <IconButton onClick={onBack} size="small" sx={{ bgcolor: 'action.hover' }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h6" component="h1" fontWeight="bold">
            History Compare
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare historical versions of stored procedures
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <ThemeToggle />
        </Box>
      </Paper>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="subtitle2" color="text.secondary" fontWeight="600">
                  CONNECTION SETTINGS
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => setIsLoginOpen(true)}
                  startIcon={<HistoryIcon />}
                >
                  Credentials
                </Button>
              </Box>

              <Box mb={3}>
                 {credentials?.saveCredentials && (
                   <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2, mb: 2 }}>
                     <Typography variant="body2" color="success.main" fontWeight="500">
                       Connected to: {credentials.server}
                     </Typography>
                     <Typography variant="caption" display="block" color="text.secondary">
                       User: {credentials.username}
                     </Typography>
                   </Box>
                 )}
              </Box>

              <Box mb={3}>
                <DatabaseSelector
                  databases={databases}
                  selectedDatabase={selectedDatabase}
                  onSelectDatabase={(db) => setDatabase(db)}
                  label={databaseLabel}
                />
              </Box>

              <ProcedureSelector
                procedures={procedures}
                selectedProcedure={selectedProcedure}
                onSelectProcedure={setSelectedProcedure}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
             <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
               <Typography variant="subtitle2" color="text.secondary" fontWeight="600" mb={3}>
                 COMPARE SNAPSHOTS
               </Typography>
               
               <Grid container spacing={3}>
                 <Grid size={{ xs: 12, md: 6 }}>
                   <SnapshotSelector
                     title="Target Version (Current)"
                     snapshots={snapshots}
                     selectedSnapshotId={snapshot1Id}
                     onSelectSnapshot={setSnapshot1Id}
                   />
                 </Grid>
                 <Grid size={{ xs: 12, md: 6 }}>
                   <SnapshotSelector
                     title="Source Version (Previous)"
                     snapshots={snapshots}
                     selectedSnapshotId={snapshot2Id}
                     onSelectSnapshot={setSnapshot2Id}
                   />
                 </Grid>
               </Grid>

               <Box textAlign="center" mt={4}>
                 <Button 
                   variant="contained" 
                   size="large" 
                   onClick={compareSnapshots}
                   startIcon={<CompareArrowsIcon />}
                   disabled={!snapshot1Id || !snapshot2Id}
                   sx={{ px: 4, borderRadius: 8 }}
                 >
                   Generate Comparison
                 </Button>
               </Box>
             </Paper>
          </Grid>
        </Grid>

        {diffs.length > 0 && (
          <Box mt={4}>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button 
                variant="outlined" 
                startIcon={<SaveIcon />}
                onClick={handleSaveDiff}
              >
                Export Results
              </Button>
            </Box>
            <DiffViewer diffs={diffs} onRemove={removeDiff} />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default HistoryCompare;
