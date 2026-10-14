'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import type { ReportReason } from '@/lib/feedback/choices';
const reasons: ReportReason[] = ['incorrect', 'meaning', 'unclear', 'other'];
export default function ReportCorrection({
  reason,
  disabled,
  error,
  onReport,
}: {
  reason: ReportReason | null;
  disabled: boolean;
  error: string | null;
  onReport: (reason: ReportReason) => Promise<boolean>;
}) {
  const t = useTranslations('feedback');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReportReason>('incorrect');
  return (
    <>
      <Button
        size="small"
        disabled={disabled}
        onClick={() => {
          setSelected(reason ?? 'incorrect');
          setOpen(true);
        }}
      >
        {t('report')}
      </Button>
      {reason ? (
        <Typography variant="caption" role="status">
          {t('reportSaved')}
        </Typography>
      ) : null}
      <Dialog
        open={open}
        onClose={() => {
          if (!disabled) setOpen(false);
        }}
        aria-labelledby="report-title"
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle id="report-title">{t('reportTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('reportNote')}
          </Typography>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t(error === 'UNAUTHENTICATED' ? 'choiceSession' : 'reportError')}
            </Alert>
          ) : null}
          <RadioGroup
            value={selected}
            onChange={(event) => setSelected(event.target.value as ReportReason)}
          >
            {reasons.map((value) => (
              <FormControlLabel
                key={value}
                value={value}
                disabled={disabled}
                control={<Radio />}
                label={t('reportReasons.' + value)}
              />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button disabled={disabled} onClick={() => setOpen(false)}>
            {t('cancelReport')}
          </Button>
          <Button
            variant="contained"
            disabled={disabled}
            onClick={async () => {
              if (await onReport(selected)) setOpen(false);
            }}
          >
            {t(disabled ? 'choiceSaving' : 'sendReport')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
