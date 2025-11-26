import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Container,
  Typography,
  Grid,
} from '@mui/material';

export type AppMode = 'home' | 'schema-compare' | 'history-compare';

interface HomeScreenProps {
  onSelectMode: (mode: AppMode) => void;
}

const IconBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      width: 80,
      height: 80,
      borderRadius: '50%',
      backgroundColor: 'primary.main',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
    }}
  >
    <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
      {children}
    </Typography>
  </Box>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectMode }) => {
  return (
    <Container maxWidth="md">
      <Box my={6}>
        <Typography variant="h3" component="h1" align="center" gutterBottom>
          SSSC
        </Typography>
        <Typography variant="h6" align="center" color="textSecondary" gutterBottom>
          Simple SQL Source Control
        </Typography>
        <Typography variant="body1" align="center" color="textSecondary" sx={{ mb: 6 }}>
          Choose a comparison mode to get started
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6}>
            <Card 
              elevation={4}
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 8,
                },
              }}
            >
              <CardActionArea 
                onClick={() => onSelectMode('schema-compare')}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconBox>{'<>'}</IconBox>
                  <Typography variant="h5" component="h2" gutterBottom>
                    Schema Compare
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Compare database schemas or script folders. 
                    Identify differences and generate update scripts.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card 
              elevation={4}
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 8,
                },
              }}
            >
              <CardActionArea 
                onClick={() => onSelectMode('history-compare')}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <IconBox>H</IconBox>
                  <Typography variant="h5" component="h2" gutterBottom>
                    History Compare
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Compare historical snapshots of stored procedures. 
                    View changes over time.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomeScreen;
