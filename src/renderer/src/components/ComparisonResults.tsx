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
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { ComparisonResult, SchemaChange, SchemaObjectType, ChangeRiskLevel } from '../../../shared/types';

interface ComparisonResultsProps {
  result: ComparisonResult;
  onReset: () => void;
  onApplyChanges: (changes: SchemaChange[]) => void;
  onSaveScripts: (changes: SchemaChange[]) => void;
}

const RISK_COLORS: Record<ChangeRiskLevel, string> = {
  safe: '#4caf50',
  warning: '#ff9800',
  destructive: '#f44336',
};

const RISK_LABELS: Record<ChangeRiskLevel, string> = {
  safe: 'Safe',
  warning: 'Warning',
  destructive: 'Destructive',
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Modified',
};

const ComparisonResults: React.FC<ComparisonResultsProps> = ({
  result,
  onReset,
  onApplyChanges,
  onSaveScripts,
}) => {
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Comparison Results
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Source: {result.source.name} → Target: {result.target.name}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Compared at {new Date(result.timestamp).toLocaleString()}
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card sx={{ bgcolor: RISK_COLORS.safe, color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4">{stats.safe}</Typography>
              <Typography variant="body2">Safe Changes</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card sx={{ bgcolor: RISK_COLORS.warning, color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4">{stats.warning}</Typography>
              <Typography variant="body2">Warnings</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card sx={{ bgcolor: RISK_COLORS.destructive, color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4">{stats.destructive}</Typography>
              <Typography variant="body2">Destructive</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card sx={{ bgcolor: 'grey.700', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4">{stats.total}</Typography>
              <Typography variant="body2">Total Changes</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search objects..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">🔍</InputAdornment>,
          }}
          sx={{ minWidth: 200 }}
        />
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
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

        <FormControl size="small" sx={{ minWidth: 120 }}>
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

        <Box sx={{ flexGrow: 1 }} />

        <Button size="small" onClick={selectAllSafe}>Select All Safe</Button>
        <Button size="small" onClick={clearSelection}>Clear Selection</Button>
      </Box>

      {filteredChanges.length === 0 ? (
        <Box sx={{ p: 4, bgcolor: 'grey.100', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            {result.changes.length === 0 
              ? 'No differences found between source and target.'
              : 'No changes match the current filters.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
          {filteredChanges.map((change, index) => {
            const key = `${change.objectName}-${index}`;
            const isExpanded = expandedItems.has(key);
            const isSelected = selectedItems.has(key);
            const canSelect = change.riskLevel !== 'destructive';

            return (
              <Card
                key={key}
                sx={{
                  mb: 1,
                  borderLeft: `4px solid ${RISK_COLORS[change.riskLevel]}`,
                  bgcolor: isSelected ? 'action.selected' : 'background.paper',
                  cursor: canSelect ? 'pointer' : 'default',
                }}
                onClick={() => canSelect && toggleSelected(key, change)}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={1}>
                      {canSelect && (
                        <Box
                          sx={{
                            width: 20,
                            height: 20,
                            border: '2px solid',
                            borderColor: isSelected ? 'primary.main' : 'grey.400',
                            borderRadius: 0.5,
                            bgcolor: isSelected ? 'primary.main' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 14,
                          }}
                        >
                          {isSelected && '✓'}
                        </Box>
                      )}
                      <Typography variant="subtitle2" component="span">
                        {change.objectName}
                      </Typography>
                      <Chip
                        label={change.objectType}
                        size="small"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                      <Chip
                        label={CHANGE_TYPE_LABELS[change.changeType]}
                        size="small"
                        color={change.changeType === 'added' ? 'success' : change.changeType === 'removed' ? 'error' : 'warning'}
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        label={RISK_LABELS[change.riskLevel]}
                        size="small"
                        sx={{
                          bgcolor: RISK_COLORS[change.riskLevel],
                          color: 'white',
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(key);
                        }}
                      >
                        {isExpanded ? 'Hide' : 'Show'} Script
                      </Button>
                    </Box>
                  </Box>

                  {change.warningMessage && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                      ⚠️ {change.warningMessage}
                    </Typography>
                  )}

                  <Collapse in={isExpanded}>
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        bgcolor: 'grey.900',
                        color: 'grey.100',
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        whiteSpace: 'pre-wrap',
                        overflow: 'auto',
                        maxHeight: 300,
                      }}
                    >
                      {change.script || '-- No script generated'}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={onReset}>
          Start New Comparison
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={selectedItems.size === 0}
        >
          Save Scripts ({selectedItems.size})
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleApply}
          disabled={selectedItems.size === 0}
        >
          Apply Changes ({selectedItems.size})
        </Button>
      </Box>
    </Box>
  );
};

export default ComparisonResults;
