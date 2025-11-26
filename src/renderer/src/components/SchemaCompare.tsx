import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';

interface SchemaCompareProps {
  onBack: () => void;
}

const SchemaCompare: React.FC<SchemaCompareProps> = ({ onBack }) => {
  return (
    <Container maxWidth="xl">
      <Container maxWidth="md">
        <Box my={4}>
          <Box display="flex" alignItems="center" mb={2}>
            <Button onClick={onBack} sx={{ mr: 2, minWidth: 'auto' }}>
              {'<'}
            </Button>
            <Typography variant="h4" component="h1">
              Schema Compare
            </Typography>
          </Box>

          <Typography variant="body1" color="textSecondary" align="center" sx={{ my: 4 }}>
            Schema Compare functionality coming soon...
          </Typography>
        </Box>
      </Container>
    </Container>
  );
};

export default SchemaCompare;
