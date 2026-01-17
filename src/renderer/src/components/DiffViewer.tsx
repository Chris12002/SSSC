// src/components/DiffViewer.tsx

import { Box, Typography, Paper, IconButton, useTheme, alpha, Card, CardHeader, CardContent } from '@mui/material';
import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { DiffItem } from '../../../shared/types';

interface DiffViewerProps {
  diffs: DiffItem[];
  onRemove: (id: string) => void;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diffs, onRemove }) => {
  const theme = useTheme();

  return (
    <Box my={4}>
      <Typography variant="h5" gutterBottom fontWeight="600">
        Comparison Results
      </Typography>
      <Box display="flex" flexDirection="column" gap={3}>
        {diffs.map((diff) => (
          <Card 
            key={diff.id} 
            elevation={0} 
            sx={{ 
              border: '1px solid', 
              borderColor: 'divider',
              overflow: 'hidden'
            }}
          >
            <CardHeader
              action={
                <IconButton 
                  onClick={() => onRemove(diff.id)} 
                  size="small"
                  sx={{ 
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'error.light', color: 'error.contrastText' }
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
              title={
                <Typography variant="subtitle1" fontWeight="bold">
                  {diff.description}
                </Typography>
              }
              sx={{ 
                bgcolor: 'background.default', 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                py: 1.5
              }}
            />
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box
                sx={{
                  overflowX: 'auto',
                  '& .d2h-wrapper': {
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: '0.85rem',
                  },
                  '& .d2h-file-header': {
                    display: 'none', // Hide internal file header if redundant
                  }
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: diff.content }} />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default DiffViewer;
