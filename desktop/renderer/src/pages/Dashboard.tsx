import React from 'react';
import { Box, Typography } from '@mui/material';

export function Dashboard() {
  return (
    <Box>
      <Box sx={{ p: 3, borderBottom: '1px solid #333', bgcolor: 'background.paper' }}>
        <Typography variant="h4">Dashboard</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>Overview</Typography>
      </Box>
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Data is automatically fetched in the background and visible under Settings.
        </Typography>
      </Box>
    </Box>
  );
}

