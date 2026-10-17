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
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import ArrowForward from '@mui/icons-material/ArrowForward';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ExpandMore from '@mui/icons-material/ExpandMore';
import LanguageOutlined from '@mui/icons-material/LanguageOutlined';
import PersonOutline from '@mui/icons-material/PersonOutlineOutlined';
import PlayCircleOutlined from '@mui/icons-material/PlayCircleOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';
import { Logo } from '@/components/layout/AppNavigation';
import LevelIllustration from './LevelIllustration';
import LiveDemo from './LiveDemo';
import LegalLinks from './LegalLinks';
import StepConnector from '@/components/ui/icons/StepConnector';
import BoardIcon from '@/components/ui/icons/BoardIcon';
import BackdropRibbons from '@/components/ui/icons/BackdropRibbons';

const navSections = ['features', 'how', 'pricing', 'faq'] as const;
const steps = ['write', 'mark', 'revise'] as const;
const stepIcons = [DescriptionOutlined, SearchOutlined, CheckStep];
function CheckStep() {
  return <BoardIcon name="check" sx={{ fontSize: 'inherit' }} />;
}
function ToneIcon() {
  return <BoardIcon name="people" />;
}
function VocabularyIcon() {
  return <BoardIcon name="book" />;
}
function GrammarIcon() {
  return <BoardIcon name="sparkles" />;
}
function LearnerIcon() {
  return <BoardIcon name="bars" />;
}
const features = [
  { id: 'grammar', icon: GrammarIcon, tile: 'pastel.lilac', accent: 'secondary.main' },
  { id: 'clarity', icon: DescriptionOutlined, tile: 'pastel.mint', accent: 'success.dark' },
  { id: 'tone', icon: ToneIcon, tile: 'pastel.blue', accent: 'info.main' },
  { id: 'vocabulary', icon: VocabularyIcon, tile: 'pastel.peach', accent: 'warning.main' },
  { id: 'usecases', icon: DescriptionOutlined, tile: 'pastel.rose', accent: 'error.main' },
  { id: 'everyone', icon: LanguageOutlined, tile: 'pastel.lilac', accent: 'secondary.main' },
] as const;
const audience = [
  { id: 'students', icon: SchoolOutlined },
  { id: 'professionals', icon: WorkOutlineOutlined },
  { id: 'learners', icon: LearnerIcon },
  { id: 'anyone', icon: PersonOutline },
] as const;
const questions = ['cost', 'types', 'account', 'privacy', 'devices'] as const;
// Anchored sections stop below the sticky header instead of under it.
const anchorOffset = 22;
const landingSplit = '@media (min-width: 760px)';

function CtaButton({
  size = 'large',
  fullWidth = false,
}: {
  size?: 'medium' | 'large';
  fullWidth?: boolean;
}) {
  const t = useTranslations('landing.pricing');
  return (
    <Button
      component={NextLink}
      href="/login"
      variant="contained"
      size={size}
      fullWidth={fullWidth}
      endIcon={<ArrowForward />}
    >
      {t('cta')}
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
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 999,
        p: 0.25,
        '& > button': {
          borderRadius: 999,
          px: 1.25,
          py: 0.25,
          fontSize: '0.75rem',
          fontWeight: 700,
        },
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
        bgcolor: 'background.paper',
        borderBlockEnd: 1,
        borderColor: 'divider',
      }}
    >
      <Container
        maxWidth="lg"
        sx={{ display: 'flex', alignItems: 'center', gap: 1, minBlockSize: 48 }}
      >
        <Logo label={t('brand')} />
        <Stack
          component="nav"
          aria-label={t('nav.label')}
          direction="row"
          sx={{
            gap: 0.5,
            marginInlineStart: 2,
            display: 'none',
            [landingSplit]: { display: 'flex' },
          }}
        >
          {navSections.map((id) => (
            <Link
              key={id}
              href={'#' + id}
              underline="none"
              color="text.secondary"
              variant="body2"
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 2,
                fontWeight: 550,
                '&:hover': { color: 'text.primary', bgcolor: 'tonal.primary' },
              }}
            >
              {t('nav.' + id)}
            </Link>
          ))}
        </Stack>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', marginInlineStart: 'auto' }}>
          <Button
            component={NextLink}
            href="/login"
            color="primary"
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, px: 1.5 }}
          >
            {t('signIn')}
          </Button>
          <Button
            component={NextLink}
            href="/login"
            variant="contained"
            endIcon={<ArrowForward />}
            sx={{ whiteSpace: 'nowrap', px: { xs: 2, sm: 2.25 } }}
          >
            {t('nav.start')}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

function Section({
  id,
  eyebrow,
  title,
  intro,
  tone = 'white',
  action,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  tone?: 'white' | 'lavender';
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={id + '-title'}
      sx={(theme) => ({
        paddingBlock: { xs: 4, md: 6 },
        bgcolor: tone === 'lavender' ? 'tonal.primary' : 'background.paper',
        scrollMarginBlockStart: theme.spacing(anchorOffset),
      })}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            gap: 2,
            alignItems: { xs: 'flex-start', sm: 'flex-end' },
            justifyContent: 'space-between',
            mb: { xs: 2, md: 3 },
          }}
        >
          <Stack sx={{ gap: 1, maxInlineSize: '78ch' }}>
            <Typography variant="eyebrow" color="secondary.main">
              {eyebrow}
            </Typography>
            <Typography id={id + '-title'} variant="landingSection" component="h2">
              {title}
            </Typography>
            {intro ? (
              <Typography color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
                {intro}
              </Typography>
            ) : null}
          </Stack>
          {action}
        </Stack>
        {children}
      </Container>
    </Box>
  );
}

function Hero() {
  const t = useTranslations('landing');
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'clip',
        backgroundImage: (theme) =>
          `radial-gradient(48rem 30rem at 8% 4%, ${theme.vars.palette.tonal.primary} 0%, transparent 64%), ` +
          `radial-gradient(44rem 28rem at 96% 18%, ${theme.vars.palette.pastel.blue} 0%, transparent 58%), ` +
          `linear-gradient(180deg, ${theme.vars.palette.background.default} 0%, ${theme.vars.palette.background.paper} 100%)`,
      }}
    >
      <BackdropRibbons expansive />
      <Box
        aria-hidden="true"
        sx={{
          display: 'none',
          position: 'absolute',
          insetBlockStart: -120,
          insetInlineEnd: -80,
          inlineSize: 420,
          blockSize: 420,
          borderRadius: '50%',
          bgcolor: 'tonal.primary',
          opacity: 0.55,
        }}
      />
      <Container maxWidth="lg" sx={{ paddingBlock: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            [landingSplit]: { gridTemplateColumns: 'minmax(0, 5.9fr) minmax(0, 6.1fr)' },
            gap: 3,
            alignItems: 'center',
          }}
        >
          <Stack sx={{ gap: 2, alignItems: 'flex-start', position: 'relative' }}>
            <Typography variant="landingTitle" component="h1" sx={{ textWrap: 'balance' }}>
              {t('titleLead')}{' '}
              <Box component="span" sx={{ display: 'block', color: 'secondary.main' }}>
                {t('titleAccent')}
              </Box>
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ fontSize: '0.875rem', lineHeight: 1.5, maxInlineSize: '54ch' }}
            >
              {t('heroBody')}
            </Typography>
            <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                component={NextLink}
                href="/login"
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
              >
                {t('tryFree')}
              </Button>
              <Button
                component={Link}
                href="#how"
                variant="outlined"
                size="large"
                startIcon={<PlayCircleOutlined />}
                sx={{ bgcolor: 'background.paper' }}
              >
                {t('howItWorks')}
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
    </Box>
  );
}

function HowItWorks() {
  const t = useTranslations('landing');
  return (
    <Section id="how" eyebrow={t('eyebrows.how')} title={t('how.title')} intro={t('how.intro')}>
      <Box
        component="ol"
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          [landingSplit]: { gridTemplateColumns: 'repeat(3, 1fr)' },
          gap: { xs: 3, md: 4 },
          m: 0,
          p: 0,
          listStyle: 'none',
        }}
      >
        {steps.map((step, index) => {
          const Icon = stepIcons[index];
          return (
            <Stack
              component="li"
              key={step}
              sx={{ gap: 1.5, position: 'relative', alignItems: 'center', textAlign: 'center' }}
            >
              {index < steps.length - 1 ? (
                <Box
                  aria-hidden="true"
                  sx={{
                    display: 'none',
                    [landingSplit]: { display: 'block' },
                    position: 'absolute',
                    insetBlockStart: 8,
                    insetInlineStart: '68%',
                    inlineSize: '64%',
                    zIndex: 0,
                  }}
                >
                  <StepConnector />
                </Box>
              ) : null}
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box
                  sx={{
                    inlineSize: 60,
                    blockSize: 60,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    bgcolor: 'tonal.primary',
                    color: 'secondary.main',
                    '& svg': { fontSize: 30 },
                  }}
                >
                  <Icon />
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    insetBlockStart: -4,
                    insetInlineStart: -4,
                    inlineSize: 23,
                    blockSize: 23,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    display: 'grid',
                    placeItems: 'center',
                    typography: 'caption',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </Box>
              </Box>
              <Typography component="h3" variant="landingCard">
                {t('steps.' + step + '.title')}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ maxInlineSize: '30ch', lineHeight: 1.4, fontSize: '0.75rem' }}
              >
                {t('steps.' + step + '.body')}
              </Typography>
            </Stack>
          );
        })}
      </Box>
    </Section>
  );
}

function Features() {
  const t = useTranslations('landing.features');
  const landing = useTranslations('landing');
  return (
    <Section
      id="features"
      eyebrow={landing('eyebrows.features')}
      title={t('title')}
      intro={t('intro')}
      tone="lavender"
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          [landingSplit]: { gridTemplateColumns: 'repeat(3, 1fr)' },
          gap: 1.5,
        }}
      >
        {features.map(({ id, icon: Icon, tile, accent }) => (
          <Paper
            key={id}
            sx={{
              p: { xs: 1.5, md: 2.5 },
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                inlineSize: 50,
                blockSize: 50,
                flexShrink: 0,
                borderRadius: 2,
                bgcolor: tile,
                color: accent,
                display: 'grid',
                placeItems: 'center',
                '& svg': { fontSize: 26 },
              }}
            >
              <Icon />
            </Box>
            <Stack sx={{ gap: 0.5, minInlineSize: 0 }}>
              <Typography component="h3" variant="landingCard">
                {t(id + '.title')}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.45, fontSize: '0.75rem' }}
              >
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
  const audienceCopy = useTranslations('landing.audience');
  const landing = useTranslations('landing');
  return (
    <Section id="levels" eyebrow={landing('eyebrows.levels')} title={t('title')} intro={t('intro')}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          [landingSplit]: { gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 4.5fr)' },
          gap: { xs: 2, md: 5 },
          alignItems: 'center',
        }}
      >
        <Stack component="ul" sx={{ m: 0, p: 0, listStyle: 'none', gap: 0.5 }}>
          {audience.map(({ id, icon: Icon }) => (
            <Stack
              component="li"
              key={id}
              direction="row"
              sx={{
                gap: 1,
                alignItems: 'center',
                p: { xs: 0.5, md: 1 },
                bgcolor: 'tonal.primary',
                borderRadius: 8,
              }}
            >
              <Box
                sx={{
                  inlineSize: 30,
                  blockSize: 30,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: 'background.paper',
                  color: 'secondary.main',
                  display: 'grid',
                  placeItems: 'center',
                  '& svg': { fontSize: 22 },
                }}
              >
                <Icon />
              </Box>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  gap: { xs: 0.25, sm: 1.5 },
                  minInlineSize: 0,
                  alignItems: { sm: 'baseline' },
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 700, minInlineSize: { sm: 90 }, fontSize: '0.6875rem' }}
                >
                  {audienceCopy(id + '.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {audienceCopy(id + '.body')}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
        <LevelIllustration />
      </Box>
    </Section>
  );
}

function Pricing() {
  const t = useTranslations('landing.pricing');
  const landing = useTranslations('landing');
  const includes = t.raw('includes') as string[];
  return (
    <Box
      component="section"
      id="pricing"
      aria-labelledby="pricing-title"
      sx={{
        bgcolor: 'tonal.primary',
        py: { xs: 3, md: 5 },
        scrollMarginBlockStart: anchorOffset * 4,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            [landingSplit]: { gridTemplateColumns: 'minmax(0, 5.6fr) minmax(0, 6.4fr)' },
            gap: { xs: 2, md: 5 },
            alignItems: 'center',
          }}
        >
          <Stack sx={{ gap: 1.5 }}>
            <Typography variant="eyebrow" color="secondary.main">
              {landing('eyebrows.pricing')}
            </Typography>
            <Typography id="pricing-title" variant="landingSection" component="h2">
              {t('title')}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
              {t('taglineTitle')}
            </Typography>
          </Stack>
          <Paper
            sx={{
              p: { xs: 2, md: 3.5 },
              borderRadius: 3,
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 4.5fr) minmax(0, 5.5fr)' },
              alignItems: 'center',
            }}
          >
            <Stack sx={{ gap: 0.5 }}>
              <Typography variant="landingCard">{t('plan')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('planNote')}
              </Typography>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'baseline', mt: 1 }}>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: 'inherit',
                    fontSize: '2rem',
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {t('price')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('forever')}
                </Typography>
              </Stack>
            </Stack>
            <Stack sx={{ gap: 0.75 }}>
              {includes.map((item) => (
                <Stack key={item} direction="row" sx={{ gap: 0.75 }}>
                  <BoardIcon
                    name="check"
                    aria-hidden="true"
                    sx={{ color: 'success.main', fontSize: 16, flexShrink: 0 }}
                  />
                  <Typography variant="body2">{item}</Typography>
                </Stack>
              ))}
              <Box sx={{ mt: 1.25 }}>
                <CtaButton size="medium" fullWidth />
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}

function Faq() {
  const t = useTranslations('landing.faq');
  const landing = useTranslations('landing');
  return (
    <Section
      id="faq"
      eyebrow={landing('eyebrows.faq')}
      title={t('title')}
      action={
        <Button
          component={Link}
          href="#faq"
          variant="outlined"
          endIcon={<ArrowForward />}
          sx={{ flexShrink: 0, bgcolor: 'background.paper' }}
        >
          {t('viewAll')}
        </Button>
      }
    >
      <Box>
        {questions.map((id, index) => (
          <Accordion
            key={id}
            disableGutters
            variant="outlined"
            sx={{
              border: 0,
              borderBlockStart: index === 0 ? 1 : 0,
              borderBlockEnd: 1,
              borderColor: 'divider',
              borderRadius: 0,
              bgcolor: 'transparent',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              id={'faq-' + id}
              sx={{ px: 1, py: 0, minHeight: 34 }}
            >
              <Typography component="h3" variant="body2" sx={{ fontWeight: 600 }}>
                {t(id + '.q')}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0, pb: 2 }}>
              <Typography color="text.secondary" sx={{ maxInlineSize: '68ch' }}>
                {t(id + '.a')}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Section>
  );
}

function FinalCall() {
  const t = useTranslations('landing.final');
  const pricing = useTranslations('landing.pricing');
  return (
    <Container maxWidth="lg" sx={{ paddingBlock: { xs: 3, md: 5 } }}>
      <Paper
        sx={{
          p: { xs: 3, md: 4.5 },
          color: 'primary.contrastText',
          borderRadius: 3.5,
          backgroundImage: (theme) =>
            `linear-gradient(115deg, ${theme.vars.palette.primary.main} 0%, color-mix(in srgb, ${theme.vars.palette.primary.main} 74%, ${theme.vars.palette.secondary.main}) 100%)`,
          display: 'flex',
          flexDirection: 'column',
          [landingSplit]: { flexDirection: 'row' },
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: 3,
        }}
      >
        <Stack sx={{ gap: 1 }}>
          <Typography
            variant="landingSection"
            component="h2"
            sx={{ color: 'inherit', fontSize: { xs: '1.375rem', md: '2rem' } }}
          >
            {t('title')}
          </Typography>
          <Typography sx={{ color: 'inherit', opacity: 0.76 }}>{t('body')}</Typography>
        </Stack>
        <Button
          component={NextLink}
          href="/login"
          size="large"
          endIcon={<ArrowForward />}
          sx={{
            bgcolor: 'background.paper',
            color: 'primary.main',
            flexShrink: 0,
            '&:hover': { bgcolor: 'background.paper', opacity: 0.92 },
          }}
        >
          {pricing('cta')}
        </Button>
      </Paper>
    </Container>
  );
}

function LandingFooter() {
  const t = useTranslations('landing');
  return (
    <Box component="footer" sx={{ borderBlockStart: 1, borderColor: 'divider', py: 1.5 }}>
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
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <Logo label={t('brand')} />
          <Typography variant="body2" color="text.secondary">
            {t('copyright')}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <LanguageToggle />
          <LegalLinks />
        </Stack>
      </Container>
    </Box>
  );
}

export default function Landing() {
  return (
    <Box data-landing sx={{ bgcolor: 'background.paper', color: 'primary.main' }}>
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
    </Box>
  );
}
