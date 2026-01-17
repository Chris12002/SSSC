import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Container,
  Typography,
  Grid,
  useTheme,
  alpha,
  Paper,
  Stack,
  Chip
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import HistoryIcon from '@mui/icons-material/History';
import StorageIcon from '@mui/icons-material/Storage';
import ThemeToggle from './ThemeToggle';

export type AppMode = 'home' | 'schema-compare' | 'history-compare';

interface HomeScreenProps {
  onSelectMode: (mode: AppMode) => void;
}

const FeatureCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  delay?: number;
}> = ({ title, description, icon, onClick, color, delay = 0 }) => {
  const theme = useTheme();
  
  return (
    <Card 
      elevation={0}
      sx={{
        height: '100%',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid',
        borderColor: theme.palette.divider,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
        overflow: 'hidden',
        position: 'relative',
        animation: `fadeInUp 0.6s ease-out ${delay}ms both`,
        '@keyframes fadeInUp': {
          '0%': {
            opacity: 0,
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)'
          }
        },
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: `0 12px 24px -4px ${alpha(color, 0.15)}`,
          borderColor: alpha(color, 0.3),
          '& .icon-box': {
            transform: 'scale(1.1) rotate(5deg)',
            backgroundColor: color,
            color: '#fff',
          }
        },
      }}
    >
      <CardActionArea 
        onClick={onClick}
        sx={{ height: '100%', p: 4 }}
      >
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            className="icon-box"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '24px',
              backgroundColor: alpha(color, 0.1),
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              mb: 1
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              {description}
            </Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
};

const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectMode }) => {
  const theme = useTheme();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: `radial-gradient(circle at 50% 0%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 50%)`
    }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>
      <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 8 }}>
        <Box textAlign="center" mb={10} sx={{ animation: 'fadeIn 0.8s ease-out' }}>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} mb={2}>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              bgcolor: 'primary.main', 
              color: 'white',
              display: 'flex'
            }}>
              <StorageIcon fontSize="large" />
            </Box>
            <Typography variant="h2" component="h1" sx={{ 
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              SSSC
            </Typography>
          </Stack>
          <Typography variant="h5" color="text.secondary" fontWeight="500" mb={4}>
            Simple SQL Source Control
          </Typography>
          <Chip 
            label="Professional Edition" 
            size="small" 
            sx={{ 
              bgcolor: alpha(theme.palette.secondary.main, 0.1), 
              color: theme.palette.secondary.main,
              fontWeight: 600
            }} 
          />
        </Box>

        <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: 900, mx: 'auto' }}>
          <Grid item xs={12} md={6}>
            <FeatureCard
              title="Schema Compare"
              description="Compare database schemas against script folders. Identify differences, generate sync scripts, and maintain consistency across environments."
              icon={<CompareArrowsIcon sx={{ fontSize: 40 }} />}
              onClick={() => onSelectMode('schema-compare')}
              color={theme.palette.primary.main}
              delay={100}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FeatureCard
              title="History Compare"
              description="Analyze historical snapshots of stored procedures. Track changes over time, audit modifications, and restore previous versions with ease."
              icon={<HistoryIcon sx={{ fontSize: 40 }} />}
              onClick={() => onSelectMode('history-compare')}
              color={theme.palette.secondary.main}
              delay={200}
            />
          </Grid>
        </Grid>

        <Box mt="auto" pt={8} textAlign="center">
          <Typography variant="caption" color="text.disabled">
            v1.0.0 • Business Oriented SQL Tools
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default HomeScreen;
