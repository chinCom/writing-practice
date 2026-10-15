'use client';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function SaveStatus({ saved, label }: { saved: boolean; label: string }) {
  return (
    <Stack direction="row" role="status" sx={{ gap: 1, alignItems: 'center' }}>
      <Box
        aria-hidden="true"
        sx={(theme) => ({
          inlineSize: 8,
          blockSize: 8,
          borderRadius: '50%',
          bgcolor: saved ? 'success.main' : 'warning.main',
          transition: theme.transitions.create('background-color'),
        })}
      />
      <Typography variant="caption">{label}</Typography>
    </Stack>
  );
}

// The bar fills toward the task maximum. The gap marks the minimum. The text counts stay the source of truth.
export function WordMeter({ words, min, max }: { words: number; min: number; max: number }) {
  const color = words > max ? 'warning' : words >= min ? 'success' : 'primary';
  return (
    <Box aria-hidden="true" sx={{ position: 'relative' }}>
      <LinearProgress
        variant="determinate"
        color={color}
        value={Math.min(100, (words / max) * 100)}
        sx={{ height: 4 }}
      />
      <Box
        sx={{
          position: 'absolute',
          insetBlock: 0,
          insetInlineStart: (min / max) * 100 + '%',
          inlineSize: 2,
          bgcolor: 'background.paper',
        }}
      />
    </Box>
  );
}
