import type { Metadata } from 'next';
import LegalPage from '@/components/landing/LegalPage';
export const metadata: Metadata = { title: 'Terms of use · Writing coach' };
export default function TermsPage() {
  return <LegalPage document="terms" />;
}
