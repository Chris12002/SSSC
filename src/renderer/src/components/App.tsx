// src/components/App.tsx

import React, { useContext, useEffect, useMemo, useState } from 'react';
import ProcedureSelector from './ProcedureSelector';
import SnapshotSelector from './SnapshotSelector';
import DiffViewer from './DiffViewer';
import { generateDiffHtml } from '../../../main/utils/diff';
import { Alert, Autocomplete, Box, Button, Container, Snackbar, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { generateFileName, prepareHtmlContent } from '../../../main/utils/export';
import { SnackbarContext, SnackbarProvider } from '../contexts/SnackbarContext';
import LoginModal from './LoginModal';
import {DiffItem, ServerLogonFields} from '../../../shared/types';
import DatabaseSelector from './DatabaseSelector';



const App: React.FC = () => {
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

  const snackbarContext = useContext(SnackbarContext);

  const { showSnackbar } = snackbarContext!;

  useEffect(() => {
    const fetchCredentials = async () => {
      const storedCredentials = await window.api.getStoredCredentials();
      if (storedCredentials) {
        setCredentials(storedCredentials);
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
    if (creds.saveCredentials) {
      // Save credentials securely
      await window.api.storeCredentials(creds);
    } else {
      // Clear any previously stored credentials
      await window.api.clearStoredCredentials();
    }
    await setDatabaseCredentials(creds);
    setIsLoginOpen(false);
    await fetchDatabases();
  };

  const setDatabaseCredentials = async (creds: ServerLogonFields) => {
    //server set
    await window.api.setCredentials(creds);

    //local set
    setCredentials(creds);
  };

  const setDatabase = async (dbName: string | null) => {
    //server set
    if (dbName){
      await window.api.updateDatabase(dbName);
     }

    //local set
    setSelectedDatabase(dbName);    
  };

  const fetchDatabases = async () => {
    try {
      const dbs = await window.api.getDatabases();
      setDatabases(dbs);
    } catch (error) {
      console.error('Error fetching databases:', error);
      // Show error to the user
      showSnackbar('Failed to fetch databases. Please check your credentials.', 'error');
      setIsLoginOpen(true);
    }
  };

  useEffect(() => {
    if (selectedDatabase) {
    const loadProcedures = async () => {
      try{
        const procs = await window.api.getProcedures();
        const sortedProcs = procs.sort((a, b) => a.localeCompare(b));
        setProcedures(sortedProcs);
        if (procs.length > 0) {
          setSelectedProcedure(procs[0]);
        }
      } catch (err) {
        showSnackbar(`Error retrieveing procedures: ${err}`, `error`);
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
      setSnapshot1Data(''); // Reset to empty string when snapshot1Id changes
    }
  }, [snapshot1Id]);

  useEffect(() => {
    if (snapshot2Id) {
      setSnapshot2Data(''); // Reset to empty string when snapshot2Id changes
    }
  }, [snapshot2Id]);

  const compareSnapshots = async () => {
    if (snapshot1Id && snapshot2Id) {
      try{
      let data1 = snapshot1Data;
      let data2 = snapshot2Data;

      // Create an array of promises for the snapshots that need to be fetched
      const promises: Promise<any>[] = [];

      // If snapshot1Data is missing, push the API call for it to the promises array
      if (!snapshot1Data) {
        promises.push(
          window.api.getSnapshotData(snapshot1Id).then((data) => {
            data1 = data;
            setSnapshot1Data(data);
          })
        );
      }

      // If snapshot2Data is missing, push the API call for it to the promises array
      if (!snapshot2Data) {
        promises.push(
          window.api.getSnapshotData(snapshot2Id).then((data) => {
            data2 = data;
            setSnapshot2Data(data);
          })
        );
      }

      // Use Promise.all to wait for all promises to resolve
      await Promise.all(promises);

      // Once both snapshots are available, generate the diff
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
      // Prepare the HTML content (as before)
      const htmlContent = await prepareHtmlContent(combinedDiffHtml);
  
      // Use a default file name
      const defaultFileName = generateFileName(
        diffs,
        snapshot1Id ? snapshot1Id.toString() : '',
        snapshot2Id ? snapshot2Id.toString() : ''
      );
  
      // Show the save dialog
      const { canceled, filePath } = await window.api.saveDialog(defaultFileName);
  
      if (canceled) {
        console.log('Save dialog was canceled');
        return;
      }
  
      if (filePath) {
        // Send the HTML content and file path to the main process to save the file
        window.api.saveHtmlFile(filePath, htmlContent);
  
        // Optionally, show a success message
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
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Change Control Diff Viewer
          </Typography>

          <DatabaseSelector
            databases={databases}
            selectedDatabase={selectedDatabase}
            onSelectDatabase={(db) => setDatabase(db)}
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
          {diffs.length > 0 && 
              <Box textAlign="center" my={2}>
                <Button variant="contained" color="primary" onClick={handleSaveDiff}>
                  Export
                </Button>
              </Box>
            }
        </Box>
    </Container>

    </Container>    
    
  );
};

export default App;
