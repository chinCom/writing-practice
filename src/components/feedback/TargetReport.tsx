import { useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Feedback } from '@/lib/feedback/schema';

export default function TargetReport({
  report,
}: {
  report: NonNullable<Feedback['target_report']>;
}) {
  const t = useTranslations('feedback');
  if (!report.length) return null;
  return (
    <Paper component="section" aria-label={t('targetsTitle')} variant="outlined" sx={{ p: 2 }}>
      <Stack sx={{ gap: 1.5 }}>
        <Typography component="h2" variant="h3">
          {t('targetsTitle')}
        </Typography>
        {report.map((target) => (
          <Stack key={target.tag} sx={{ gap: 0.5 }}>
            <Typography variant="subtitle2">{t('tags.' + target.tag)}</Typography>
            {target.uses === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('targetUnused')}
              </Typography>
            ) : (
              <>
                <Typography variant="body2">
                  {t('targetCorrect', { correct: target.uses - target.errors, uses: target.uses })}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('targetErrors', { errors: target.errors })}
                </Typography>
              </>
            )}
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}
