import React, { useContext, useState } from 'react';
import { Box, Button, CircularProgress, Container, Typography, IconButton, Paper, useTheme, alpha } from '@mui/material';
import Grid from '@mui/material/Grid2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SourceSelector from './SourceSelector';
import ComparisonResults from './ComparisonResults';
import ThemeToggle from './ThemeToggle';
import { SchemaSource, ComparisonResult, SchemaChange } from '../../../shared/types';
import { SnackbarContext } from '../contexts/SnackbarContext';

interface SchemaCompareProps {
  onBack: () => void;
}

type CompareStep = 'select-sources' | 'comparing' | 'results';

const SchemaCompare: React.FC<SchemaCompareProps> = ({ onBack }) => {
  const theme = useTheme();
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
      const safeChanges = changes.filter(c => c.riskLevel !== 'destructive');
      const scripts = safeChanges
        .map(c => c.script)
        .filter((s): s is string => Boolean(s));

      if (scripts.length === 0) {
        showSnackbar('No scripts to apply', 'info');
        return;
      }

      showSnackbar(`Applying ${scripts.length} changes...`, 'info');
      
      const result = await window.api.executeScripts(targetConfig, scripts);
      
      if (result.success) {
        showSnackbar(`Successfully applied ${scripts.length} changes`, 'success');
      } else {
        const errorSummary = result.errors.slice(0, 3).join('; ');
        showSnackbar(`Some changes failed: ${errorSummary}`, 'error');
        console.error('Apply changes errors:', result.errors);
      }
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
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
            Schema Compare
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare schemas and generate synchronization scripts
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <ThemeToggle />
        </Box>
      </Paper>

      <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
        {step === 'select-sources' && (
          <Box maxWidth="lg" mx="auto">
            <Typography variant="h5" gutterBottom fontWeight="600" sx={{ mb: 3 }}>
              Select Data Sources
            </Typography>
            
            {error && (
              <Box sx={{ mb: 3, p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main', borderRadius: 2 }}>
                <Typography variant="body2" fontWeight="500">{error}</Typography>
              </Box>
            )}

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, md: 6 }}>
                <SourceSelector
                  title="Source (Origin)"
                  sourceId="sourceA"
                  source={sourceConfig}
                  onSourceChange={setSourceConfig}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <SourceSelector
                  title="Target (Destination)"
                  sourceId="sourceB"
                  source={targetConfig}
                  onSourceChange={setTargetConfig}
                />
              </Grid>
            </Grid>

            <Box textAlign="center" my={6}>
              <Button
                variant="contained"
                size="large"
                onClick={handleCompare}
                disabled={!canCompare}
                sx={{ 
                  px: 6, 
                  py: 1.5, 
                  fontSize: '1.1rem',
                  borderRadius: '50px',
                  boxShadow: !canCompare ? 'none' : theme.shadows[4]
                }}
              >
                Compare Schemas
              </Button>
            </Box>
          </Box>
        )}

        {step === 'comparing' && (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            minHeight="50vh"
          >
            <CircularProgress size={60} thickness={4} sx={{ mb: 4, color: 'primary.main' }} />
            <Typography variant="h5" gutterBottom fontWeight="600">
              Analyzing Differences
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Comparing {sourceConfig?.name} vs {targetConfig?.name}
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
              This might take a few seconds...
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
      </Container>
    </Box>
  );
};

export default SchemaCompare;
