// src/components/DiffViewer.tsx

import { Box, Typography, Paper } from '@mui/material';
import React from 'react';

interface DiffViewerProps {
  diffHtml: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diffHtml }) => {
  return (
    <Box my={4} >
      <Typography variant="h5" gutterBottom>
        Diff Results
      </Typography>
      <Paper elevation={3} style={{ padding: 16, overflowX: 'auto' }}>
        <div
          id="diff-view"
          dangerouslySetInnerHTML={{ __html: diffHtml }}
        ></div>
      </Paper>
    </Box>
  );
};

export default DiffViewer;
