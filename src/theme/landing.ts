import type { CSSObject, Theme } from '@mui/material/styles';

/** Marketing-only MUI adjustments stay in the theme, away from workspace components. */
export function landingStyles(theme: Theme): CSSObject {
  const desktop = theme.breakpoints.up('sm');
  const wide = theme.breakpoints.up('lg');
  return {
    '& .MuiContainer-root': {
      paddingInline: theme.spacing(3),
      [desktop]: { paddingInline: 'clamp(3rem, 7vw, 5rem)' },
    },
    '& .MuiTypography-landingTitle': {
      color: theme.vars.palette.primary.main,
      [desktop]: { fontSize: '2.5rem' },
      [wide]: { fontSize: '4rem' },
    },
    '& .MuiTypography-landingSection': {
      [desktop]: { fontSize: '1.375rem' },
      [wide]: { fontSize: '2rem' },
    },
    '& .MuiTypography-landingCard': {
      [desktop]: { fontSize: '0.75rem' },
      [wide]: { fontSize: '1rem' },
    },
    '& .MuiTypography-body2': {
      [desktop]: { fontSize: '0.6875rem' },
      [wide]: { fontSize: '0.8125rem' },
    },
    '& .MuiTypography-eyebrow': { color: theme.vars.palette.secondary.main, fontSize: '0.625rem' },
    '& #features .MuiPaper-root': { gap: theme.spacing(2), minHeight: 96 },
    '& #levels .MuiTypography-body2': {
      [desktop]: { fontSize: '0.625rem' },
      [wide]: { fontSize: '0.8125rem' },
    },
    '& #pricing .MuiPaper-root': { gap: theme.spacing(1), paddingBlock: theme.spacing(2) },
    '& #pricing .MuiPaper-root .MuiTypography-body2': {
      lineHeight: 1.4,
      [desktop]: { fontSize: '0.625rem' },
      [wide]: { fontSize: '0.8125rem' },
    },
    '& #pricing .MuiPaper-root .MuiButton-root': { whiteSpace: 'nowrap' },
    '& #faq': { paddingBlockEnd: theme.spacing(1) },
    '& #faq .MuiAccordionSummary-content': { marginBlock: theme.spacing(0.75) },
    '& .MuiButton-root': {
      minHeight: 44,
      paddingInline: theme.spacing(2),
      [desktop]: { fontSize: '0.6875rem', minHeight: 36 },
      [wide]: { fontSize: '0.9375rem' },
    },
    '& [data-live-demo] .MuiButton-root': {
      paddingInline: theme.spacing(1.5),
      whiteSpace: 'nowrap',
    },
    '& [data-live-demo] .MuiIconButton-root': {
      [desktop]: { minWidth: 32, minHeight: 32, padding: theme.spacing(0.5) },
    },
    '& header .MuiSvgIcon-root': { fontSize: 24 },
    '& header .MuiTypography-subtitle1': { fontSize: '0.8125rem' },
    '& header .MuiLink-root': { paddingInline: theme.spacing(1), fontSize: '0.625rem' },
    '& header .MuiStack-root': { gap: theme.spacing(0.5) },
  };
}
