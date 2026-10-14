'use client';
import NextLink from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';

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
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}
        >
          <Typography variant="h3" component="h2">
            {t('saved')}
          </Typography>
          <Button
            component={NextLink}
            href={preview ? '/dev/preview/portfolio' : '/portfolio'}
            sx={{ px: 0, minHeight: 32, fontSize: '1rem' }}
          >
            {t('portfolio')}
          </Button>
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
                  <TableCell>{t('action')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.slice(0, 3).map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell component="th" scope="row">
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 2.75 }}>
                        <DescriptionOutlined
                          sx={{ fontSize: '1.5rem', display: { xs: 'none', sm: 'block' } }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 550 }}>
                          {submission.title ?? learning('attempt', { n: submission.attempt })}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell
                      sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}
                    >
                      {format.dateTime(new Date(submission.createdAt), {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {format.number(submission.wordCount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        component={NextLink}
                        href={preview ? '/dev/preview/feedback' : '/feedback/' + submission.id}
                        sx={{ px: 0, fontSize: '1rem', whiteSpace: 'nowrap' }}
                      >
                        {learning('open')}
                      </Button>
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
