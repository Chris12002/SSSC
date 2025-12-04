import React, { useContext, useState } from 'react';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import SourceSelector from './SourceSelector';
import ComparisonResults from './ComparisonResults';
import { SchemaSource, ComparisonResult, SchemaChange } from '../../../shared/types';
import { SnackbarContext } from '../contexts/SnackbarContext';

interface SchemaCompareProps {
  onBack: () => void;
}

type CompareStep = 'select-sources' | 'comparing' | 'results';

const SchemaCompare: React.FC<SchemaCompareProps> = ({ onBack }) => {
  const [step, setStep] = useState<CompareStep>('select-sources');
  const [sourceConfig, setSourceConfig] = useState<SchemaSource | null>(null);
  const [targetConfig, setTargetConfig] = useState<SchemaSource | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snackbarContext = useContext(SnackbarContext);
  const { showSnackbar } = snackbarContext!;

  const canCompare = sourceConfig !== null && targetConfig !== null;

  const handleCompare = async () => {
    if (!canCompare || !sourceConfig || !targetConfig) return;
    
    setStep('comparing');
    setError(null);
    
    try {
      const result = await window.api.compareSchemas(sourceConfig, targetConfig);
      setComparisonResult(result);
      setStep('results');
    } catch (err: any) {
      console.error('Comparison failed:', err);
      setError(err.message || 'Failed to compare schemas');
      setStep('select-sources');
      showSnackbar(`Comparison failed: ${err.message}`, 'error');
    }
  };

  const handleReset = () => {
    setStep('select-sources');
    setSourceConfig(null);
    setTargetConfig(null);
    setComparisonResult(null);
    setError(null);
  };

  const handleApplyChanges = async (changes: SchemaChange[]) => {
    if (!targetConfig || targetConfig.type !== 'database') {
      showSnackbar('Cannot apply changes: target is not a database', 'error');
      return;
    }

    try {
      const scripts = changes
        .filter(c => c.riskLevel !== 'destructive')
        .map(c => c.script)
        .filter(Boolean)
        .join('\n\nGO\n\n');

      showSnackbar(`Ready to apply ${changes.length} changes. Script execution not yet implemented.`, 'info');
      console.log('Scripts to apply:', scripts);
    } catch (err: any) {
      showSnackbar(`Failed to apply changes: ${err.message}`, 'error');
    }
  };

  const handleSaveScripts = async (changes: SchemaChange[]) => {
    try {
      const scripts = changes
        .map(c => {
          const header = `-- ${c.changeType.toUpperCase()}: ${c.objectName} (${c.objectType})\n-- Risk Level: ${c.riskLevel}\n`;
          return header + (c.script || '-- No script generated');
        })
        .join('\n\nGO\n\n');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultFileName = `schema-changes-${timestamp}.sql`;
      
      const result = await window.api.saveSqlDialog(defaultFileName);
      
      if (!result.canceled && result.filePath) {
        await window.api.saveTextFile(result.filePath, scripts);
        showSnackbar(`Scripts saved to ${result.filePath}`, 'success');
      }
    } catch (err: any) {
      showSnackbar(`Failed to save scripts: ${err.message}`, 'error');
    }
  };

  return (
    <Container maxWidth="xl">
      <Container maxWidth="lg">
        <Box my={4}>
          <Box display="flex" alignItems="center" mb={4}>
            <Button onClick={onBack} sx={{ mr: 2, minWidth: 'auto' }}>
              {'<'}
            </Button>
            <Typography variant="h4" component="h1">
              Schema Compare
            </Typography>
          </Box>

          {step === 'select-sources' && (
            <>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                Select a source and target to compare. You can compare databases, script folders, or a combination of both.
              </Typography>

              {error && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography color="error.contrastText">{error}</Typography>
                </Box>
              )}

              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <SourceSelector
                    title="Source"
                    sourceId="sourceA"
                    source={sourceConfig}
                    onSourceChange={setSourceConfig}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <SourceSelector
                    title="Target"
                    sourceId="sourceB"
                    source={targetConfig}
                    onSourceChange={setTargetConfig}
                  />
                </Grid>
              </Grid>

              <Box textAlign="center" my={4}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleCompare}
                  disabled={!canCompare}
                >
                  Compare Schemas
                </Button>
              </Box>

              {!canCompare && (sourceConfig || targetConfig) && (
                <Typography variant="body2" color="textSecondary" align="center">
                  Please select both a source and target to continue
                </Typography>
              )}
            </>
          )}

          {step === 'comparing' && (
            <Box textAlign="center" my={8}>
              <CircularProgress size={48} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                Comparing schemas...
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Analyzing {sourceConfig?.name} vs {targetConfig?.name}
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 2 }}>
                This may take a moment for large databases
              </Typography>
            </Box>
          )}

          {step === 'results' && comparisonResult && (
            <ComparisonResults
              result={comparisonResult}
              onReset={handleReset}
              onApplyChanges={handleApplyChanges}
              onSaveScripts={handleSaveScripts}
            />
          )}
        </Box>
      </Container>
    </Container>
  );
};

export default SchemaCompare;
