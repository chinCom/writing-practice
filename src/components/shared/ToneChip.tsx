'use client';
import Chip, { type ChipProps } from '@mui/material/Chip';

export type ChipTone = 'primary' | 'success' | 'warning' | 'error' | 'info';

export type ToneChipProps = Omit<ChipProps, 'variant' | 'color'> & {
  tone?: ChipTone;
};

/** A soft status/level chip. The theme supplies the tonal palettes. */
export default function ToneChip({ tone = 'primary', ...props }: ToneChipProps) {
  return <Chip {...props} variant="tonal" color={tone} />;
}
