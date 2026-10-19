'use client';

import { useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import { SkeletonButton, SkeletonLines, SkeletonText } from '@/components/shared/ContentSkeleton';

export function RevisionContentSkeleton() {
  const t = useTranslations('portfolio');
  const scores = useTranslations('feedback');
  return (
    <Stack data-ui="revision-content-skeleton" sx={{ gap: 3 }}>
      <SkeletonText width={200} />
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ marginBlockEnd: 2 }}>
          {t('changes')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ marginBlockEnd: 2 }}>
          {t('legend')}
        </Typography>
        <SkeletonLines variant="canvas" widths={['98%', '70%']} />
      </Paper>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {['score', 'before', 'after', 'delta'].map((column) => (
                <TableCell key={column}>{t(column)}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {['task', 'organization', 'grammar', 'vocabulary'].map((score) => (
              <TableRow key={score}>
                <TableCell>{scores(score)}</TableCell>
                {[0, 1, 2].map((column) => (
                  <TableCell key={column}>
                    <SkeletonText variant="body2" width={32} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="text.secondary">
        {t('scoreNote')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1 }}>
        <SkeletonButton />
        <SkeletonButton />
      </Stack>
    </Stack>
  );
}

export default function RevisionSkeleton() {
  const t = useTranslations('portfolio');
  return (
    <Stack data-ui="revision-skeleton" sx={{ gap: 3 }}>
      <Typography variant="h1">{t('comparisonTitle')}</Typography>
      <SkeletonButton width={150} />
      <RevisionContentSkeleton />
    </Stack>
  );
}
