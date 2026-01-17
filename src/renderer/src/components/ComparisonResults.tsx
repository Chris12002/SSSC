import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Stack,
  IconButton,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { ComparisonResult, SchemaChange, SchemaObjectType, ChangeRiskLevel } from '../../../shared/types';

interface ComparisonResultsProps {
  result: ComparisonResult;
  onReset: () => void;
  onApplyChanges: (changes: SchemaChange[]) => void;
  onSaveScripts: (changes: SchemaChange[]) => void;
}

const RISK_COLORS: Record<ChangeRiskLevel, string> = {
  safe: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  destructive: '#EF4444', // Red 500
};

const RISK_ICONS: Record<ChangeRiskLevel, React.ReactNode> = {
  safe: <CheckCircleIcon fontSize="small" />,
  warning: <WarningIcon fontSize="small" />,
  destructive: <ErrorIcon fontSize="small" />,
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Modified',
};

const CHANGE_TYPE_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  added: 'success',
  removed: 'error',
  modified: 'warning',
};

const StatCard: React.FC<{ label: string; count: number; color: string; icon: React.ReactNode }> = ({ label, count, color, icon }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      bgcolor: alpha(color, 0.1),
      border: '1px solid',
      borderColor: alpha(color, 0.2),
      borderRadius: 3,
    }}
  >
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ color: color }}>
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight="500">
        {label}
      </Typography>
    </Box>
    <Box sx={{ 
      p: 1.5, 
      borderRadius: '50%', 
      bgcolor: alpha(color, 0.2), 
      color: color,
      display: 'flex'
    }}>
      {icon}
    </Box>
  </Paper>
);

const ComparisonResults: React.FC<ComparisonResultsProps> = ({
  result,
  onReset,
  onApplyChanges,
  onSaveScripts,
}) => {
  const theme = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<SchemaObjectType | 'all'>('all');
  const [filterRisk, setFilterRisk] = useState<ChangeRiskLevel | 'all'>('all');
  const [searchText, setSearchText] = useState('');

  const filteredChanges = useMemo(() => {
    return result.changes.filter((change) => {
      if (filterType !== 'all' && change.objectType !== filterType) return false;
      if (filterRisk !== 'all' && change.riskLevel !== filterRisk) return false;
      if (searchText && !change.objectName.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [result.changes, filterType, filterRisk, searchText]);

  const stats = useMemo(() => {
    const counts = { safe: 0, warning: 0, destructive: 0, total: 0 };
    for (const change of result.changes) {
      counts[change.riskLevel]++;
      counts.total++;
    }
    return counts;
  }, [result.changes]);

  const objectTypes = useMemo(() => {
    const types = new Set<SchemaObjectType>();
    for (const change of result.changes) {
      types.add(change.objectType);
    }
    return Array.from(types).sort();
  }, [result.changes]);

  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const toggleSelected = (key: string, change: SchemaChange) => {
    if (change.riskLevel === 'destructive') return;
    
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  };

  const selectAllSafe = () => {
    const safeKeys = new Set<string>();
    filteredChanges.forEach((change, index) => {
      if (change.riskLevel === 'safe') {
        safeKeys.add(`${change.objectName}-${index}`);
      }
    });
    setSelectedItems(safeKeys);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const getSelectedChanges = (): SchemaChange[] => {
    return filteredChanges.filter((change, index) => 
      selectedItems.has(`${change.objectName}-${index}`)
    );
  };

  const handleApply = () => {
    const selected = getSelectedChanges();
    if (selected.length > 0) {
      onApplyChanges(selected);
    }
  };

  const handleSave = () => {
    const selected = getSelectedChanges();
    if (selected.length > 0) {
      onSaveScripts(selected);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 6 }}>
        <Grid container spacing={2}>
           <Grid size={{ xs: 12, sm: 3 }}>
             <StatCard label="Safe Changes" count={stats.safe} color={RISK_COLORS.safe} icon={<CheckCircleIcon />} />
           </Grid>
           <Grid size={{ xs: 12, sm: 3 }}>
             <StatCard label="Warnings" count={stats.warning} color={RISK_COLORS.warning} icon={<WarningIcon />} />
           </Grid>
           <Grid size={{ xs: 12, sm: 3 }}>
             <StatCard label="Destructive" count={stats.destructive} color={RISK_COLORS.destructive} icon={<ErrorIcon />} />
           </Grid>
           <Grid size={{ xs: 12, sm: 3 }}>
             <Paper
              elevation={0}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
              }}
            >
              <Box>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  Total Changes
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'action.hover', color: 'text.secondary', display: 'flex' }}>
                <FilterListIcon />
              </Box>
            </Paper>
           </Grid>
        </Grid>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search objects..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Object Type</InputLabel>
                <Select
                  value={filterType}
                  label="Object Type"
                  onChange={(e) => setFilterType(e.target.value as SchemaObjectType | 'all')}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {objectTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={filterRisk}
                  label="Risk Level"
                  onChange={(e) => setFilterRisk(e.target.value as ChangeRiskLevel | 'all')}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="safe">Safe</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="destructive">Destructive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={selectAllSafe}>Select Safe</Button>
                <Button size="small" onClick={clearSelection} color="inherit">Clear</Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {filteredChanges.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No changes found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {result.changes.length === 0 
                ? 'The source and target schemas are identical.'
                : 'Try adjusting your filters to see more results.'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {filteredChanges.map((change, index) => {
              const key = `${change.objectName}-${index}`;
              const isExpanded = expandedItems.has(key);
              const isSelected = selectedItems.has(key);
              const canSelect = change.riskLevel !== 'destructive';

              return (
                <Box key={key} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                      transition: 'background-color 0.2s',
                      cursor: canSelect ? 'pointer' : 'default',
                      '&:hover': {
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'action.hover',
                      }
                    }}
                    onClick={() => canSelect && toggleSelected(key, change)}
                  >
                    <Grid container alignItems="center" spacing={2}>
                      <Grid size="auto">
                         <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 1,
                            border: '2px solid',
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            bgcolor: isSelected ? 'primary.main' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            visibility: canSelect ? 'visible' : 'hidden',
                          }}
                        >
                          {isSelected && <CheckCircleIcon sx={{ fontSize: 18 }} />}
                        </Box>
                      </Grid>
                      <Grid size="grow">
                        <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                          <Typography variant="subtitle1" fontWeight="600">
                            {change.objectName}
                          </Typography>
                          <Chip
                            label={change.objectType}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.7rem', borderRadius: 1 }}
                          />
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Chip
                            label={CHANGE_TYPE_LABELS[change.changeType]}
                            size="small"
                            color={CHANGE_TYPE_COLORS[change.changeType]}
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                          />
                           <Box display="flex" alignItems="center" gap={0.5}>
                             {RISK_ICONS[change.riskLevel]}
                             <Typography 
                               variant="caption" 
                               fontWeight="600"
                               sx={{ color: RISK_COLORS[change.riskLevel] }}
                             >
                               {change.riskLevel.toUpperCase()}
                             </Typography>
                           </Box>
                        </Stack>
                      </Grid>
                      <Grid size="auto">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(key);
                          }}
                        >
                          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </Grid>
                    </Grid>

                     {change.warningMessage && (
                        <Box mt={1} p={1} bgcolor={alpha(theme.palette.warning.main, 0.1)} borderRadius={1} display="flex" gap={1}>
                          <WarningIcon fontSize="small" color="warning" />
                          <Typography variant="caption" color="warning.main">
                            {change.warningMessage}
                          </Typography>
                        </Box>
                      )}
                  </Box>
                  
                  <Collapse in={isExpanded}>
                    <Box sx={{ bgcolor: '#1e1e1e', p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Box 
                        component="pre" 
                        sx={{ 
                          m: 0, 
                          color: '#d4d4d4', 
                          fontFamily: 'Consolas, "Courier New", monospace', 
                          fontSize: '0.85rem',
                          overflowX: 'auto',
                          maxHeight: 400
                        }}
                      >
                        {change.script || '-- No script generated'}
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      <Paper 
        elevation={4} 
        sx={{ 
          position: 'fixed', 
          bottom: 32, 
          left: '50%', 
          transform: 'translateX(-50%)',
          zIndex: 100,
          borderRadius: 50,
          visibility: selectedItems.size > 0 ? 'visible' : 'hidden',
          opacity: selectedItems.size > 0 ? 1 : 0,
          transition: 'all 0.3s',
        }}
      >
        <Box sx={{ p: 1, pl: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" fontWeight="600">
            {selectedItems.size} changes selected
          </Typography>
          <Box display="flex" gap={1}>
             <Button
              variant="outlined"
              color="inherit"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              sx={{ borderRadius: 50 }}
            >
              Save Script
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleApply}
              sx={{ borderRadius: 50 }}
            >
              Apply Selected
            </Button>
          </Box>
        </Box>
      </Paper>
      
      {/* Floating Action Button for Reset if scrolled down or at bottom? Maybe just keep button at top/bottom */}
      {/* Keeping "Start New Comparison" at the top or in header might be better, but "Reset" in Props is available. */}
    </Box>
  );
};

export default ComparisonResults;
