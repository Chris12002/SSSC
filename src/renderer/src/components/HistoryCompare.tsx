import React, { useContext, useEffect, useMemo, useState } from 'react';
import ProcedureSelector from './ProcedureSelector';
import SnapshotSelector from './SnapshotSelector';
import DiffViewer from './DiffViewer';
import { generateDiffHtml } from '../../../main/utils/diff';
import { Box, Button, Container, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { generateFileName, prepareHtmlContent } from '../../../main/utils/export';
import { SnackbarContext } from '../contexts/SnackbarContext';
import LoginModal from './LoginModal';
import { DiffItem, ServerLogonFields } from '../../../shared/types';
import DatabaseSelector from './DatabaseSelector';

interface HistoryCompareProps {
  onBack: () => void;
}

const HistoryCompare: React.FC<HistoryCompareProps> = ({ onBack }) => {
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
    ? `Select Database (${credentials.username}@${credentials.server})`
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
    <Container maxWidth="xl">
      <LoginModal
        open={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSubmit={handleLoginSubmit}
        initialValues={credentials || undefined}
      />
      <Container maxWidth="md">
        <Box my={4}>
          <Box display="flex" alignItems="center" mb={2}>
            <Button onClick={onBack} sx={{ mr: 2, minWidth: 'auto' }}>
              {'<'}
            </Button>
            <Typography variant="h4" component="h1">
              History Compare
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="body2" color="textSecondary">
              {credentials?.saveCredentials
                ? `Saved credentials for ${credentials.server} (${credentials.username})`
                : 'No saved credentials'}
            </Typography>
            <Box>
              <Button variant="text" size="small" onClick={() => setIsLoginOpen(true)} sx={{ mr: 1 }}>
                {credentials ? 'Update Credentials' : 'Add Credentials'}
              </Button>
              {credentials?.saveCredentials && (
                <Button variant="text" size="small" onClick={handleClearStoredCredentials}>
                  Clear Saved Credentials
                </Button>
              )}
            </Box>
          </Box>

          <DatabaseSelector
            databases={databases}
            selectedDatabase={selectedDatabase}
            onSelectDatabase={(db) => setDatabase(db)}
            label={databaseLabel}
          />

          <ProcedureSelector
            procedures={procedures}
            selectedProcedure={selectedProcedure}
            onSelectProcedure={setSelectedProcedure}
          />

          <Grid container spacing={4} justifyContent="center" my={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SnapshotSelector
                title="Current"
                snapshots={snapshots}
                selectedSnapshotId={snapshot1Id}
                onSelectSnapshot={setSnapshot1Id}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <SnapshotSelector
                title="Previous"
                snapshots={snapshots}
                selectedSnapshotId={snapshot2Id}
                onSelectSnapshot={setSnapshot2Id}
              />
            </Grid>
          </Grid>

          <Box textAlign="center" my={2}>
            <Button variant="contained" color="primary" onClick={compareSnapshots}>
              Compare
            </Button>
          </Box>
        </Box>
      </Container>

      {diffs.length > 0 && <DiffViewer diffs={diffs} onRemove={removeDiff} />}

      <Container maxWidth="md">
        <Box my={4}>
          {diffs.length > 0 && (
            <Box textAlign="center" my={2}>
              <Button variant="contained" color="primary" onClick={handleSaveDiff}>
                Export
              </Button>
            </Box>
          )}
        </Box>
      </Container>
    </Container>
  );
};

export default HistoryCompare;
