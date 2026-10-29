import 'server-only';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type PageTitle =
  | 'today'
  | 'path'
  | 'placement'
  | 'lesson'
  | 'write'
  | 'feedback'
  | 'revision'
  | 'practice'
  | 'progress'
  | 'portfolio'
  | 'settings'
  | 'login'
  | 'onboarding'
  | 'privacy'
  | 'terms';

/** A localized tab title; the root layout appends the app name. */
export async function pageMetadata(page: PageTitle): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: t(page) };
}

export async function rootMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    title: { default: t('name'), template: '%s · ' + t('name') },
    description: t('description'),
    applicationName: t('name'),
  };
}

export async function landingMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return { title: { absolute: t('landing') } };
}
