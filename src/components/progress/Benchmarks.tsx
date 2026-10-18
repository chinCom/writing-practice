'use client';
import { useFormatter, useTranslations } from 'next-intl';
import SectionPanel from '@/components/shared/SectionPanel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import type { BenchmarkComparison } from '@/lib/benchmarks';

export default function Benchmarks({ comparisons }: { comparisons: BenchmarkComparison[] }) {
  const t = useTranslations('progress');
  const tags = useTranslations('feedback.tags');
  const format = useFormatter();
  const number = (value: number | null) =>
    value === null
      ? t('benchmarkInsufficient')
      : format.number(value, { maximumFractionDigits: 1 });
  const rate = (value: number | null) =>
    value === null
      ? t('benchmarkUnused')
      : format.number(value, { style: 'percent', maximumFractionDigits: 1 });
  return (
    <SectionPanel title={t('benchmarksTitle')} headingComponent="h3" titleId="benchmarks-title">
      {!comparisons.length ? <Typography>{t('benchmarkEmpty')}</Typography> : null}
      {comparisons.map((comparison) => (
        <Stack key={comparison.unitId + comparison.version} sx={{ gap: 1 }}>
          <Typography component="h3" variant="h3" sx={{ overflowWrap: 'anywhere' }}>
            {comparison.unitId}
          </Typography>
          <Typography variant="caption" sx={{ overflowWrap: 'anywhere' }}>
            {t('benchmarkVersion', { version: comparison.version })}
          </Typography>
          <Typography>{t('benchmarkBefore', { value: number(comparison.before) })}</Typography>
          <Typography>{t('benchmarkAfter', { value: number(comparison.after) })}</Typography>
          <Typography variant="body2">
            {t('benchmarkChange', { change: t('benchmark-' + comparison.scoreChange) })}
          </Typography>
          {comparison.targets.map((target) => (
            <Typography key={target.tag} variant="body2">
              {tags(target.tag)}: {rate(target.before)} → {rate(target.after)} ·{' '}
              {t('benchmark-' + target.change)}
            </Typography>
          ))}
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle1">{t('benchmarkContext')}</Typography>
          <Typography variant="body2">
            {t('benchmarkWords', {
              before: number(comparison.indicators.before.words),
              after: number(comparison.indicators.after.words),
            })}
          </Typography>
          <Typography variant="body2">
            {t('benchmarkRange', {
              before: t(
                comparison.indicators.before.inRange ? 'benchmarkInRange' : 'benchmarkOutOfRange',
              ),
              after: t(
                comparison.indicators.after.inRange ? 'benchmarkInRange' : 'benchmarkOutOfRange',
              ),
            })}
          </Typography>
          <Typography variant="body2">
            {t('benchmarkSentence', {
              before: number(comparison.indicators.before.meanSentenceLength),
              after: number(comparison.indicators.after.meanSentenceLength),
            })}
          </Typography>
          <Typography variant="body2">
            {t('benchmarkMtld', {
              before: number(comparison.indicators.before.mtld),
              after: number(comparison.indicators.after.mtld),
            })}
          </Typography>
        </Stack>
      ))}
      <Typography variant="caption" color="text.secondary">
        {t('benchmarkDisclaimer')}
      </Typography>
    </SectionPanel>
  );
}
