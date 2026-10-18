import type { ButtonProps } from '@mui/material/Button';

/** The three action weights used across the workspace. */
export type ActionTone = 'primary' | 'secondary' | 'quiet';

export const actionTones = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'primary' },
  quiet: { variant: 'text', color: 'primary' },
} as const satisfies Record<ActionTone, Pick<ButtonProps, 'variant' | 'color'>>;
