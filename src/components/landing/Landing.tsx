'use client';

import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlined';
import CompareArrows from '@mui/icons-material/CompareArrows';
import ExpandMore from '@mui/icons-material/ExpandMore';
import HelpOutline from '@mui/icons-material/HelpOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import MapOutlined from '@mui/icons-material/MapOutlined';
import Replay from '@mui/icons-material/Replay';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import { Logo } from '@/components/layout/AppNavigation';
import LegalLinks from './LegalLinks';
import LiveDemo from './LiveDemo';

const sections = ['how', 'features', 'levels', 'pricing', 'faq'] as const;
const steps = ['write', 'mark', 'revise'] as const;
const features: { id: string; icon: typeof MapOutlined }[] = [
  { id: 'path', icon: MapOutlined },
  { id: 'explain', icon: HelpOutline },
  { id: 'revise', icon: CompareArrows },
  { id: 'practice', icon: Replay },
  { id: 'progress', icon: InsightsOutlined },
  { id: 'ielts', icon: SchoolOutlined },
];
const levels = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const included = ['lessons', 'checks', 'practice', 'ielts'] as const;
const questions = ['cost', 'privacy', 'official', 'devices', 'level'] as const;
// Anchored sections stop below the sticky header instead of under it.
const anchorOffset = 12;

function StartButton() {
  const t = useTranslations('landing');
  return (
    <Button component={NextLink} href="/login" variant="contained" size="large">
      {t('start')}
    </Button>
  );
}

function LanguageToggle() {
  const t = useTranslations('landing.nav');
  const locale = useLocale();
  const router = useRouter();
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={locale}
      aria-label={t('language')}
      onChange={(_, value: string | null) => {
        if (!value) return;
        // Same cookie as Settings, so the choice carries into the app after sign-in.
        document.cookie = 'locale=' + value + '; Path=/; Max-Age=31536000; SameSite=Lax';
        router.refresh();
      }}
    >
      <ToggleButton value="en" lang="en">
        EN
      </ToggleButton>
      <ToggleButton value="vi" lang="vi">
        VI
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

function LandingHeader() {
  const t = useTranslations('landing');
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        insetBlockStart: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: 'background.default',
        borderBlockEnd: 1,
        borderColor: 'divider',
      }}
    >
      <Container
        maxWidth="lg"
        sx={{ display: 'flex', alignItems: 'center', gap: 2, minBlockSize: 64 }}
      >
        <Logo />
        <Stack
          component="nav"
          aria-label={t('nav.label')}
          direction="row"
          sx={{ gap: 2.5, marginInlineStart: 3, display: { xs: 'none', md: 'flex' } }}
        >
          {sections.map((id) => (
            <Link key={id} href={'#' + id} underline="hover" color="text.primary" variant="body2">
              {t('nav.' + id)}
            </Link>
          ))}
        </Stack>
        <Stack direction="row" sx={{ gap: 1, alignItems: 'center', marginInlineStart: 'auto' }}>
          <LanguageToggle />
          <Button
            component={NextLink}
            href="/login"
            sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {t('signIn')}
          </Button>
          <Button component={NextLink} href="/login" variant="contained">
            {t('nav.start')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

function Section({
  id,
  title,
  intro,
  tone = 'default',
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  tone?: 'default' | 'paper';
  children: ReactNode;
}) {
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={id + '-title'}
      sx={(theme) => ({
        paddingBlock: { xs: 6, md: 9 },
        bgcolor: tone === 'paper' ? 'background.paper' : 'background.default',
        scrollMarginBlockStart: theme.spacing(anchorOffset),
      })}
    >
      <Container maxWidth="lg">
        <Stack sx={{ gap: 1.5, mb: { xs: 4, md: 5 }, maxInlineSize: '60ch' }}>
          <Typography id={id + '-title'} variant="h2" sx={{ textWrap: 'balance' }}>
            {title}
          </Typography>
          {intro ? <Typography color="text.secondary">{intro}</Typography> : null}
        </Stack>
        {children}
      </Container>
    </Box>
  );
}

function Hero() {
  const t = useTranslations('landing');
  return (
    <Container maxWidth="lg" sx={{ paddingBlock: { xs: 5, md: 9 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 6fr)' },
          gap: { xs: 4, md: 6 },
          alignItems: 'center',
        }}
      >
        <Stack sx={{ gap: 2.5, alignItems: 'flex-start' }}>
          <Chip label={t('eyebrow')} color="primary" variant="tonal" size="small" />
          <Typography variant="h1" sx={{ textWrap: 'balance' }}>
            {t('title')}
          </Typography>
          <Typography color="text.secondary" sx={{ maxInlineSize: '52ch' }}>
            {t('body')}
          </Typography>
          <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap' }}>
            <StartButton />
            <Button component={NextLink} href="/login" variant="outlined" size="large">
              {t('signIn')}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {t('heroNote')}
          </Typography>
        </Stack>
        <Box sx={{ minInlineSize: 0 }}>
          <LiveDemo />
        </Box>
      </Box>
    </Container>
  );
}

function HowItWorks() {
  const t = useTranslations('landing');
  return (
    <Section id="how" title={t('how.title')} intro={t('how.intro')} tone="paper">
      <Box
        component="ol"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          m: 0,
          p: 0,
          listStyle: 'none',
        }}
      >
        {steps.map((step, index) => (
          <Stack component="li" key={step} sx={{ gap: 1.5 }}>
            <Box
              aria-hidden="true"
              sx={{
                inlineSize: 40,
                blockSize: 40,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: 'tonal.primary',
                color: 'primary.main',
                typography: 'subtitle1',
                fontWeight: 700,
              }}
            >
              {index + 1}
            </Box>
            <Typography component="h3" variant="h3">
              {t('steps.' + step + '.title')}
            </Typography>
            <Typography color="text.secondary">{t('steps.' + step + '.body')}</Typography>
          </Stack>
        ))}
      </Box>
    </Section>
  );
}

function Features() {
  const t = useTranslations('landing.features');
  return (
    <Section id="features" title={t('title')}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2.5,
        }}
      >
        {features.map(({ id, icon: Icon }) => (
          <Paper key={id} variant="outlined" sx={{ p: 3 }}>
            <Stack sx={{ gap: 1.5 }}>
              <Icon color="primary" />
              <Typography component="h3" variant="h3">
                {t(id + '.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(id + '.body')}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Section>
  );
}

function Levels() {
  const t = useTranslations('landing.levels');
  return (
    <Section id="levels" title={t('title')} intro={t('intro')} tone="paper">
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          listStyle: 'none',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          columnGap: 5,
        }}
      >
        {levels.map((level) => (
          <Stack
            component="li"
            key={level}
            direction="row"
            sx={{
              gap: 2,
              alignItems: 'center',
              paddingBlock: 1.75,
              borderBlockEnd: 1,
              borderColor: 'divider',
            }}
          >
            <Chip
              label={level.replace('_', '-')}
              color="primary"
              variant="tonal"
              sx={{ minInlineSize: 72, fontVariantNumeric: 'tabular-nums' }}
            />
            <Typography>{t(level)}</Typography>
          </Stack>
        ))}
      </Box>
    </Section>
  );
}

function Pricing() {
  const t = useTranslations('landing.pricing');
  return (
    <Section id="pricing" title={t('title')}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 }, maxInlineSize: 520 }}>
        <Stack sx={{ gap: 2.5 }}>
          <Stack sx={{ gap: 0.5 }}>
            <Typography variant="subtitle1" color="text.secondary">
              {t('plan')}
            </Typography>
            <Typography variant="h2" component="p">
              {t('price')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('note')}
            </Typography>
          </Stack>
          <Stack component="ul" sx={{ gap: 1.25, m: 0, p: 0, listStyle: 'none' }}>
            {included.map((item) => (
              <Stack component="li" key={item} direction="row" sx={{ gap: 1.25 }}>
                <CheckCircleOutline color="success" fontSize="small" aria-hidden="true" />
                <Typography variant="body2">{t('includes.' + item)}</Typography>
              </Stack>
            ))}
          </Stack>
          <Box>
            <StartButton />
          </Box>
        </Stack>
      </Paper>
    </Section>
  );
}

function Faq() {
  const t = useTranslations('landing.faq');
  return (
    <Section id="faq" title={t('title')} tone="paper">
      <Box sx={{ maxInlineSize: 760 }}>
        {questions.map((id) => (
          <Accordion key={id} disableGutters variant="outlined">
            <AccordionSummary expandIcon={<ExpandMore />} id={'faq-' + id}>
              <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>
                {t(id + '.q')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">{t(id + '.a')}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Section>
  );
}

function FinalCall() {
  const t = useTranslations('landing.final');
  return (
    <Container maxWidth="lg" sx={{ paddingBlock: { xs: 6, md: 9 } }}>
      <Paper
        sx={{
          p: { xs: 3, md: 6 },
          bgcolor: 'tonal.primary',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 3,
        }}
      >
        <Stack sx={{ gap: 1 }}>
          <Typography variant="h2" sx={{ textWrap: 'balance' }}>
            {t('title')}
          </Typography>
          <Typography color="text.secondary">{t('body')}</Typography>
        </Stack>
        <Box>
          <StartButton />
        </Box>
      </Paper>
    </Container>
  );
}

function LandingFooter() {
  const t = useTranslations('landing');
  return (
    <Box component="footer" sx={{ borderBlockStart: 1, borderColor: 'divider', paddingBlock: 3 }}>
      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {t('copyright')}
        </Typography>
        <LegalLinks />
      </Container>
    </Box>
  );
}

export default function Landing() {
  return (
    <>
      <LandingHeader />
      <Box component="main" id="main" tabIndex={-1}>
        <Hero />
        <HowItWorks />
        <Features />
        <Levels />
        <Pricing />
        <Faq />
        <FinalCall />
      </Box>
      <LandingFooter />
    </>
  );
}
