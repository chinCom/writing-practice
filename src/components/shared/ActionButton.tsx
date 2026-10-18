'use client';
import Button, { type ButtonProps } from '@mui/material/Button';
import { actionTones, type ActionTone } from './action-tones';

export type ActionButtonProps = Omit<ButtonProps, 'variant' | 'color' | 'component'> & {
  tone?: ActionTone;
};

/**
 * The app's button weights: primary for the one forward action, secondary for a
 * supporting action, quiet for in-place recovery such as retry or close.
 */
export default function ActionButton({ tone = 'primary', ...props }: ActionButtonProps) {
  return <Button {...props} {...actionTones[tone]} />;
}
