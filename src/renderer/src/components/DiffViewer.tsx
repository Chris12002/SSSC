// src/components/DiffViewer.tsx

import { Box, Typography, Paper, Button } from '@mui/material';
import React from 'react';
import { DiffItem } from '../../../shared/types';

interface DiffViewerProps {
  diffs: DiffItem[];
  onRemove: (id: string) => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diffs, onRemove }) => {
  return (
    <Box my={4} >
      <Typography variant="h5" gutterBottom>
        Diff Results
      </Typography>
      <Paper elevation={3} style={{ padding: 16, overflowX: 'auto' }}>
        {diffs.map((diff) => (
          <div key={diff.id}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => onRemove(diff.id)}
            >
              Remove
            </Button>
            <Typography variant="h6">{diff.description}</Typography>
            <div
              dangerouslySetInnerHTML={{ __html: diff.content }}
            />
          </div>
        ))}
      </Paper>
    </Box>
  );
};

export default DiffViewer;
