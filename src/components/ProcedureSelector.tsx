// src/components/ProcedureSelector.tsx

import { Autocomplete, FormControl, InputLabel, TextField } from '@mui/material';
import React from 'react';

interface ProcedureSelectorProps {
  procedures: string[];
  selectedProcedure: string;
  onSelectProcedure: (procName: string) => void;
}

const ProcedureSelector: React.FC<ProcedureSelectorProps> = ({
  procedures,
  selectedProcedure,
  onSelectProcedure,
}) => {
  return (
    <FormControl fullWidth variant="outlined" margin="normal">
    <Autocomplete
    options={procedures}
    value={selectedProcedure}
    onChange={(event: any, newValue: string | null) => {
      if (newValue){
        onSelectProcedure(newValue);
      }      
    }}
    renderInput={(params) => (
      <TextField {...params} label="Select Procedure" variant="outlined" />
    )}
    sx={{ width: 300 }}
  />
  </FormControl>

  );
};

export default ProcedureSelector;
