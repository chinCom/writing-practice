'use client';
import { useFormatter, useTranslations } from 'next-intl';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import type { ProgressSummary } from '@/lib/progress';

export default function ReviewInsights({ skills }: { skills: ProgressSummary['skills'] }) {
  const t = useTranslations('progress');
  const tags = useTranslations('feedback.tags');
  const format = useFormatter();
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        {t('insights')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('insightNote')}
      </Typography>
      {skills.length ? (
        <TableContainer>
          <Table size="small" aria-label={t('insights')}>
            <TableHead>
              <TableRow>
                <TableCell>{t('skill')}</TableCell>
                <TableCell>{t('rate')}</TableCell>
                <TableCell>{t('accuracy')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {skills.map((skill) => (
                <TableRow key={skill.tag}>
                  <TableCell component="th" scope="row">
                    {tags(skill.tag)}
                  </TableCell>
                  <TableCell>
                    {format.number(skill.errorsPer100Words, { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {skill.accuracy === null
                      ? t('unreviewed')
                      : t('reviewAccuracy', {
                          n: skill.correct,
                          total: skill.reviews,
                          percent: format.number(skill.accuracy, {
                            style: 'percent',
                            maximumFractionDigits: 0,
                          }),
                        })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>{t('noErrors')}</Typography>
      )}
    </Paper>
  );
}
