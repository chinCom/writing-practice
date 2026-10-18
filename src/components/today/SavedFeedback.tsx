'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Box from '@mui/material/Box';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ArrowForward from '@mui/icons-material/ArrowForward';
import NavigationButton from '@/components/shared/NavigationButton';

export interface SavedSubmission {
  id: string;
  createdAt: string;
  wordCount: number;
  attempt: number;
  title?: string | null;
}

export default function SavedFeedback({
  submissions,
  preview = false,
}: {
  submissions: SavedSubmission[];
  preview?: boolean;
}) {
  const t = useTranslations('today');
  const learning = useTranslations('learning');
  const format = useFormatter();
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, '&:last-child': { pb: { xs: 2, md: 2.5 } } }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                inlineSize: 38,
                blockSize: 38,
                borderRadius: 1.5,
                bgcolor: 'tonal.primary',
                color: 'secondary.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <DescriptionOutlined sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="h3" component="h2">
              {t('saved')}
            </Typography>
          </Stack>
          <NavigationButton
            href={preview ? '/dev/preview/portfolio' : '/portfolio'}
            endIcon={<ArrowForward sx={{ fontSize: '1rem !important' }} />}
            sx={{ paddingInline: 1.5, minHeight: 36, fontSize: '0.8125rem' }}
          >
            {t('portfolio')}
          </NavigationButton>
        </Stack>
        {submissions.length ? (
          <TableContainer>
            <Table size="small" aria-label={t('saved')}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('writing')}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {t('date')}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {t('words')}
                  </TableCell>
                  <TableCell align="right">{t('action')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.slice(0, 3).map((submission) => (
                  <TableRow
                    key={submission.id}
                    sx={{
                      '&:last-child td, &:last-child th': { borderBottom: 0 },
                      '&:hover': { bgcolor: 'background.default' },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            inlineSize: 32,
                            blockSize: 32,
                            borderRadius: 1,
                            bgcolor: 'background.default',
                            color: 'secondary.main',
                            display: { xs: 'none', sm: 'grid' },
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <DescriptionOutlined sx={{ fontSize: 17 }} />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {submission.title ?? learning('attempt', { n: submission.attempt })}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell
                      sx={{
                        whiteSpace: 'nowrap',
                        color: 'text.secondary',
                        display: { xs: 'none', sm: 'table-cell' },
                      }}
                    >
                      {format.dateTime(new Date(submission.createdAt), {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </TableCell>
                    <TableCell
                      sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}
                    >
                      {format.number(submission.wordCount)}
                    </TableCell>
                    <TableCell align="right">
                      <NavigationButton
                        href={preview ? '/dev/preview/feedback' : '/feedback/' + submission.id}
                        endIcon={<ArrowForward sx={{ fontSize: '0.875rem !important' }} />}
                        sx={{
                          paddingInline: 1.5,
                          minHeight: 36,
                          fontSize: '0.8125rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {learning('open')}
                      </NavigationButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" sx={{ py: 3 }}>
            {learning('empty')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
