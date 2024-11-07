// DatabaseSelector.tsx

// DatabaseSelector.tsx
import React from 'react';
import { Autocomplete, TextField } from '@mui/material';

interface DatabaseSelectorProps {
  databases: string[];
  selectedDatabase: string | null;
  onSelectDatabase: (database: string | null) => void;
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
  databases,
  selectedDatabase,
  onSelectDatabase,
}) => {
  return (
    <Autocomplete
      options={databases}
      value={selectedDatabase}
      onChange={(event, newValue) => {
        onSelectDatabase(newValue);
      }}
      renderInput={(params) => <TextField {...params} label="Select Database" variant="outlined" />}
    />
  );
};

export default DatabaseSelector;
