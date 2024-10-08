// src/components/App.tsx

import React, { useContext, useEffect, useState } from 'react';
import ProcedureSelector from './ProcedureSelector';
import SnapshotSelector from './SnapshotSelector';
import DiffViewer from './DiffViewer';
import { generateDiffHtml } from '../diff';
import { Alert, Autocomplete, Box, Button, Container, Snackbar, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import { generateFileName, prepareHtmlContent } from '../export';
import { SnackbarContext, SnackbarProvider } from '../contexts/SnackbarContext';

const App: React.FC = () => {
  const [procedures, setProcedures] = useState<string[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<string>('');
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshot1Id, setSnapshot1Id] = useState<number | null>(null);
  const [snapshot2Id, setSnapshot2Id] = useState<number | null>(null);
  const [snapshot1Data, setSnapshot1Data] = useState<string>('');
  const [snapshot2Data, setSnapshot2Data] = useState<string>('');
  const [diffHtml, setDiffHtml] = useState<string>('');
  const ERROR_STRING = '<p>Error retrieving snapshots.</p>';

  const snackbarContext = useContext(SnackbarContext);

  if (!snackbarContext) {
    throw new Error('SnackbarContext must be used within a SnackbarProvider');
  }

  const { showSnackbar } = snackbarContext;

  useEffect(() => {
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
  }, []);


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
        const diff = generateDiffHtml(data2, data1, selectedProcedure);
        setDiffHtml(diff);
      } else {
        setDiffHtml(ERROR_STRING);
      }
    } catch (err) {
      setDiffHtml(ERROR_STRING);
    }
    }
  };

  const handleSaveDiff = async () => {
    try {
      // Prepare the HTML content (as before)
      const htmlContent = await prepareHtmlContent(diffHtml);
  
      // Use a default file name
      const defaultFileName = generateFileName(
        selectedProcedure,
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
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" align="center" gutterBottom>
          Change Control Diff Viewer
        </Typography>

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
        {diffHtml && 
          <Box textAlign="center" my={2}>
            <Button variant="contained" color="primary" onClick={handleSaveDiff}>
              Export
            </Button>
          </Box>
        }
      </Box>
      
    </Container>
    {diffHtml && <DiffViewer diffHtml={diffHtml} />}
    </Container>    
  );
};

export default App;
