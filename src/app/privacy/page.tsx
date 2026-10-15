import type { Metadata } from 'next';
import LegalPage from '@/components/landing/LegalPage';
export const metadata: Metadata = { title: 'Privacy policy · Writing coach' };
export default function PrivacyPage() {
  return <LegalPage document="privacy" />;
}
