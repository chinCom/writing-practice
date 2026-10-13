import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { useTranslations } from 'next-intl';
import type { LocatedFeedback } from '@/lib/feedback/schema';

export default function ScoreBars({ scores }: { scores: LocatedFeedback['scores'] }) {
  const t = useTranslations('feedback');
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
      {(['task', 'grammar', 'organization', 'vocabulary'] as const).map((name) => (
        <Box
          key={name}
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Typography variant="caption">{t(name)}</Typography>
          <LinearProgress
            variant="determinate"
            value={scores[name] * 20}
            color={scores[name] >= 4 ? 'success' : scores[name] === 3 ? 'info' : 'error'}
            aria-label={t('score', { name: t(name), n: scores[name] })}
          />
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {scores[name]}/5
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
