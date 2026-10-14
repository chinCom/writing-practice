'use client';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import Check from '@mui/icons-material/Check';
import LockOutlined from '@mui/icons-material/LockOutlined';
import Circle from '@mui/icons-material/Circle';

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
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" sx={{ gap: 2, alignItems: 'center', mb: 1.25 }}>
          <MenuBookOutlined />
          <Typography variant="subtitle1" component="h2">
            {t('keepBuilding')}
          </Typography>
        </Stack>
        {path ? (
          <>
            <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
              <Chip label={path.level} color="primary" variant="tonal" size="small" />
              <Typography variant="subtitle1" component="p">
                {path.title}
              </Typography>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                mt: 2,
                mb: 2.5,
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
                      borderColor: step.state === 'locked' ? 'divider' : 'success.main',
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
                      <Circle sx={{ color: 'success.main', fontSize: '0.875rem' }} />
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
        <Button
          fullWidth
          variant="outlined"
          component={NextLink}
          href={preview ? '/dev/preview/path' : '/path'}
        >
          {t('learningPath')}
        </Button>
      </CardContent>
    </Card>
  );
}
