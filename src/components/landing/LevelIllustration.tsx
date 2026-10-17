'use client';

import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircle from '@mui/icons-material/CheckCircle';

/**
 * The floating browser panel and checklist card from the landing reference.
 */
export default function LevelIllustration() {
  const t = useTranslations('landing.levels');
  const checks = t.raw('checks') as string[];
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'relative',
        minBlockSize: { xs: 185, md: 300 },
        display: { xs: 'none', sm: 'block' },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          insetInline: '4%',
          insetBlockStart: 28,
          insetBlockEnd: 8,
          borderRadius: '50%',
          bgcolor: 'tonal.primary',
        }}
      />
      <Paper
        sx={{
          position: 'absolute',
          insetBlockStart: 20,
          insetInlineStart: '2%',
          inlineSize: '70%',
          p: 1.5,
          borderRadius: 3,
          boxShadow: (theme) => theme.shadows[6],
          transform: 'rotate(0deg)',
        }}
      >
        <Stack direction="row" sx={{ gap: 0.75, mb: 2.5 }}>
          {['pastel.rose', 'pastel.sand', 'pastel.mint'].map((color) => (
            <Box
              key={color}
              sx={{ inlineSize: 9, blockSize: 9, borderRadius: '50%', bgcolor: color }}
            />
          ))}
        </Stack>
        <Stack sx={{ gap: 1.25 }}>
          {[88, 72, 94, 61, 80].map((width, index) => (
            <Box
              key={index}
              sx={{
                blockSize: 8,
                inlineSize: width + '%',
                borderRadius: 999,
                bgcolor: index === 0 ? 'secondary.main' : 'tonal.primary',
                opacity: index === 0 ? 0.4 : 1,
              }}
            />
          ))}
        </Stack>
      </Paper>
      <Paper
        sx={{
          position: 'absolute',
          insetInlineEnd: 0,
          insetBlockEnd: 22,
          inlineSize: { sm: '58%', md: '55%' },
          p: 1.5,
          borderRadius: 3,
          boxShadow: (theme) => theme.shadows[8],
          transform: 'rotate(0deg)',
        }}
      >
        <Stack sx={{ gap: 1.5 }}>
          {checks.map((check) => (
            <Stack key={check} direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
              <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 550 }}>
                {check}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>
      <Box
        sx={{
          position: 'absolute',
          insetBlockStart: 34,
          insetInlineEnd: 8,
          inlineSize: 34,
          blockSize: 3,
          borderRadius: 999,
          bgcolor: 'secondary.main',
          transform: 'rotate(30deg)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          insetBlockStart: 46,
          insetInlineEnd: 26,
          inlineSize: 22,
          blockSize: 3,
          borderRadius: 999,
          bgcolor: 'secondary.main',
          transform: 'rotate(-18deg)',
        }}
      />
    </Box>
  );
}
