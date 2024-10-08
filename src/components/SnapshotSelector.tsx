// src/components/SnapshotSelector.tsx

import { FormControl, Typography, InputLabel, Select, MenuItem } from '@mui/material';
import React from 'react';

interface SnapshotSelectorProps {
  title: string;
  snapshots: any[];
  selectedSnapshotId: number | null;
  onSelectSnapshot: (snapshotId: number) => void;
}

const SnapshotSelector: React.FC<SnapshotSelectorProps> = ({
  title,
  snapshots,
  selectedSnapshotId,
  onSelectSnapshot,
}) => {
  return (
    <FormControl fullWidth variant="outlined">
    <InputLabel id={`${title}-label`}>{title}</InputLabel>
    <Select
      labelId={`${title}-label`}
      value={selectedSnapshotId !== null ? selectedSnapshotId : ''}
      onChange={(e) => onSelectSnapshot(Number(e.target.value))}
      label={title}
    >
      {snapshots.map((snapshot) => (
        <MenuItem key={snapshot.ChangeControlID} value={snapshot.ChangeControlID}>
          {new Date(snapshot.ChangeDateTime).toLocaleString()}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
  );
};

export default SnapshotSelector;
