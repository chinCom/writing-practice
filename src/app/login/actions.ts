'use server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { authClient } from '@/lib/auth/server';

export async function signIn(input: unknown): Promise<{ ok: boolean }> {
  const parsed = z
    .strictObject({ provider: z.literal('email'), email: z.email().max(254) })
    .safeParse(input);
  if (!parsed.success) return { ok: false };
  const client = await authClient();
  if (!client) return { ok: false };
  const origin = (await headers()).get('origin');
  if (!origin) return { ok: false };
  const redirectTo = new URL('/auth/callback', origin).toString();
  const { error } = await client.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: redirectTo },
  });
  return { ok: !error };
}
export async function signOut(): Promise<{ ok: boolean }> {
  try {
    const client = await authClient();
    if (!client) return { ok: false };
    const { error } = await client.auth.signOut();
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
