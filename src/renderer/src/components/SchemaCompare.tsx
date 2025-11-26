import React, { useState } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import Grid from '@mui/material/Grid2';
import SourceSelector from './SourceSelector';
import { SchemaSource } from '../../../shared/types';

interface SchemaCompareProps {
  onBack: () => void;
}

type CompareStep = 'select-sources' | 'comparing' | 'results';

const SchemaCompare: React.FC<SchemaCompareProps> = ({ onBack }) => {
  const [step, setStep] = useState<CompareStep>('select-sources');
  const [sourceConfig, setSourceConfig] = useState<SchemaSource | null>(null);
  const [targetConfig, setTargetConfig] = useState<SchemaSource | null>(null);

  const canCompare = sourceConfig !== null && targetConfig !== null;

  const handleCompare = async () => {
    if (!canCompare) return;
    
    setStep('comparing');
    
    // TODO: Implement actual comparison logic in future tasks
    // For now, just show a placeholder
    setTimeout(() => {
      setStep('results');
    }, 1000);
  };

  const handleReset = () => {
    setStep('select-sources');
    setSourceConfig(null);
    setTargetConfig(null);
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

              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <SourceSelector
                    title="Source"
                    source={sourceConfig}
                    onSourceChange={setSourceConfig}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <SourceSelector
                    title="Target"
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
              <Typography variant="h6" gutterBottom>
                Comparing schemas...
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Analyzing {sourceConfig?.name} vs {targetConfig?.name}
              </Typography>
            </Box>
          )}

          {step === 'results' && (
            <Box my={4}>
              <Typography variant="h5" gutterBottom>
                Comparison Results
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                Source: {sourceConfig?.name} | Target: {targetConfig?.name}
              </Typography>
              
              <Box sx={{ p: 4, bgcolor: 'grey.100', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  Schema comparison results will appear here once implemented.
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  The comparison engine will extract DDL objects from both sources,
                  identify differences, and display them with color-coded risk levels.
                </Typography>
              </Box>

              <Box textAlign="center" mt={4}>
                <Button variant="outlined" onClick={handleReset}>
                  Start New Comparison
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Container>
    </Container>
  );
};

export default SchemaCompare;
