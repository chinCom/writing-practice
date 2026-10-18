'use client';
import LinearProgress from '@mui/material/LinearProgress';
import type { SxProps, Theme } from '@mui/material/styles';

export type LoadingBarProps = {
  label: string;
  sx?: SxProps<Theme>;
};

/** The indeterminate progress bar used while a screen or AI result loads. */
export default function LoadingBar({ label, sx }: LoadingBarProps) {
  return <LinearProgress aria-label={label} sx={sx} data-ui="loading-bar" />;
}
