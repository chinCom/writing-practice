'use client';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import BoardIcon from '@/components/ui/icons/BoardIcon';
import Check from '@mui/icons-material/Check';
import LockOutlined from '@mui/icons-material/LockOutlined';
import Circle from '@mui/icons-material/Circle';
import ArrowForward from '@mui/icons-material/ArrowForward';
import NavigationButton from '@/components/shared/NavigationButton';
import ToneChip from '@/components/shared/ToneChip';

export type LearningSnapshotData = {
  level: string;
  title: string;
  steps: { title: string; state: 'done' | 'current' | 'locked' | 'available' }[];
};
export default function LearningSnapshot({
  path,
  preview = false,
}: {
  path?: LearningSnapshotData;
  preview?: boolean;
}) {
  const t = useTranslations('today');
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, md: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1, alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1.5 }}
        >
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <Box
              sx={{
                inlineSize: 28,
                blockSize: 28,
                borderRadius: 1.5,
                bgcolor: 'transparent',
                color: 'secondary.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <BoardIcon name="book" sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h3" component="h2">
              {t('keepBuilding')}
            </Typography>
          </Stack>
          <NavigationButton
            href={preview ? '/dev/preview/path' : '/path'}
            endIcon={<ArrowForward />}
            sx={{
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              px: 1.5,
              alignSelf: { xs: 'flex-start', sm: 'auto' },
            }}
          >
            {t('learningPath')}
          </NavigationButton>
        </Stack>
        {path ? (
          <>
            <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
              <ToneChip label={path.level} tone="primary" size="small" />
              <Typography variant="subtitle1" component="p" sx={{ minInlineSize: 0 }}>
                {path.title}
              </Typography>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                mt: 2,
                mb: 0,
              }}
            >
              {path.steps.slice(0, 3).map((step, index) => (
                <Box key={step.title} sx={{ position: 'relative', textAlign: 'center' }}>
                  {index < Math.min(path.steps.length, 3) - 1 ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        insetBlockStart: 16,
                        insetInlineStart: '50%',
                        width: '100%',
                        borderTop: 2,
                        borderColor: step.state === 'done' ? 'success.main' : 'divider',
                      }}
                    />
                  ) : null}
                  <Box
                    sx={{
                      position: 'relative',
                      mx: 'auto',
                      width: 32,
                      height: 32,
                      border: 2,
                      borderRadius: '50%',
                      borderColor:
                        step.state === 'locked'
                          ? 'divider'
                          : step.state === 'current'
                            ? 'success.main'
                            : 'success.main',
                      bgcolor: step.state === 'done' ? 'success.main' : 'background.paper',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {step.state === 'done' ? (
                      <Check sx={{ color: 'primary.contrastText', fontSize: '1.25rem' }} />
                    ) : step.state === 'locked' ? (
                      <LockOutlined sx={{ fontSize: '1rem' }} />
                    ) : (
                      <Circle
                        sx={{
                          color: step.state === 'current' ? 'success.main' : 'success.main',
                          fontSize: step.state === 'current' ? '1rem' : '0.875rem',
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.75 }}>
                    {index + 1}. {preview ? t(step.title) : step.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {t(step.state === 'done' ? 'complete' : step.state)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('pathEmpty')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
