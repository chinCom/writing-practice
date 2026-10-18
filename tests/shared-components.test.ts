import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@mui/material/styles';
import Button from '@mui/material/Button';
import { expect, it } from 'vitest';
import { makeTheme } from '@/theme/theme';
import SectionPanel from '@/components/shared/SectionPanel';
import IconBadge from '@/components/shared/IconBadge';
import EmptyState from '@/components/shared/EmptyState';
import ActionNotice from '@/components/shared/ActionNotice';
import WritingField from '@/components/shared/WritingField';
import StatTile from '@/components/shared/StatTile';
import ActionButton from '@/components/shared/ActionButton';
import NavigationButton from '@/components/shared/NavigationButton';
import ToneChip from '@/components/shared/ToneChip';
import LoadingBar from '@/components/shared/LoadingBar';
import SectionTitle from '@/components/shared/SectionTitle';
import VisuallyHidden from '@/components/shared/VisuallyHidden';

const theme = makeTheme();
function render(element: ReactElement) {
  return renderToStaticMarkup(h(ThemeProvider, { theme }, element));
}
it('renders a named semantic section with an explicit heading and native action', () => {
  const html = render(
    h(
      SectionPanel,
      {
        title: 'Unit benchmarks',
        titleId: 'benchmarks',
        description: 'Comparable writing only.',
        action: h(Button, { href: '/practice' }, 'Practice'),
      },
      'Report content',
    ),
  );
  expect(html).toMatch(/<section[^>]*aria-labelledby="benchmarks"/);
  expect(html).toMatch(/<h2[^>]*id="benchmarks"/);
  expect(html).toContain('Comparable writing only.');
  expect(html).toContain('href="/practice"');
  expect(html).toContain('Report content');
});
it('generates distinct heading ids and supports nested heading levels', () => {
  const html = render(
    h(
      'main',
      null,
      h(SectionPanel, { title: 'First', headingComponent: 'h3' }),
      h(SectionPanel, { title: 'Second' }),
    ),
  );
  const ids = [...html.matchAll(/<section[^>]*aria-labelledby="([^"]+)"/g)].map(
    (match) => match[1],
  );
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
  expect(html).toMatch(/<h3[^>]*>/);
  for (const id of ids) expect(html).toContain(`id="${id}"`);
});
it('keeps empty-state help and next actions within the named state', () => {
  const html = render(
    h(
      EmptyState,
      {
        title: 'No reviews due',
        description: 'Your reviews will return when they are due.',
        action: h(Button, { href: '/write/weekend' }, 'Write a message'),
      },
      'Next review: tomorrow',
    ),
  );
  expect(html).toContain('data-ui="empty-state"');
  expect(html).toMatch(/<h2[^>]*>No reviews due<\/h2>/);
  expect(html).toContain('Next review: tomorrow');
  expect(html).toContain('href="/write/weekend"');
});
it('preserves notice roles, disabled actions and explanatory content', () => {
  const html = render(
    h(
      ActionNotice,
      {
        message: 'Your writing is still here.',
        role: 'status',
        severity: 'warning',
        action: h(Button, { disabled: true }, 'Retry'),
      },
      'Reconnect before retrying.',
    ),
  );
  expect(html).toContain('role="status"');
  expect(html).toContain('disabled=""');
  expect(html).toContain('Your writing is still here.');
  expect(html).toContain('Reconnect before retrying.');
});
it('treats redundant icon badges as decorative and shares them with metrics', () => {
  expect(render(h(IconBadge, { tone: 'green', size: 'small' }, 'icon'))).toContain(
    'aria-hidden="true"',
  );
  const html = render(
    h(StatTile, { label: 'Saved pieces', value: 4, icon: 'icon', id: 'saved-count' }),
  );
  expect(html).toContain('data-ui="icon-badge"');
  expect(html).toContain('aria-label="Saved pieces"');
  expect(html).toContain('id="saved-count"');
});
it('preserves writing safeguards and object input props', () => {
  const html = render(
    h(WritingField, {
      label: 'Your writing',
      slotProps: { htmlInput: { maxLength: 25, spellCheck: true, dir: 'rtl' } },
    }),
  );
  expect(html).toContain('dir="ltr"');
  expect(html).toContain('spellCheck="false"');
  expect(html).toContain('maxLength="25"');
  expect(html).toContain('data-enable-grammarly="false"');
});
it('also forwards MUI callback input props without relaxing writing safeguards', () => {
  const html = render(
    h(WritingField, {
      label: 'Your writing',
      slotProps: { htmlInput: () => ({ maxLength: 17, spellCheck: true }) },
    }),
  );
  expect(html).toContain('maxLength="17"');
  expect(html).toContain('spellCheck="false"');
});
it('maps every action tone to the same MUI weight used before sharing', () => {
  const primary = render(h(ActionButton, { tone: 'primary', type: 'submit' }, 'Save'));
  const secondary = render(h(ActionButton, { tone: 'secondary' }, 'Review'));
  const quiet = render(h(ActionButton, { tone: 'quiet', 'aria-label': 'Retry' }, 'Retry'));
  expect(primary).toContain('MuiButton-contained');
  expect(primary).toContain('type="submit"');
  expect(secondary).toContain('MuiButton-outlined');
  expect(quiet).toContain('MuiButton-text');
  expect(quiet).toContain('aria-label="Retry"');
});
it('keeps internal navigation as a real link with the shared tone', () => {
  const quiet = render(h(NavigationButton, { href: '/practice' }, 'Practice'));
  expect(quiet).toMatch(/<a[^>]*href="\/practice"/);
  expect(quiet).toContain('MuiButton-text');
  const primary = render(
    h(NavigationButton, { href: '/write/weekend', tone: 'primary', prefetch: false }, 'Write'),
  );
  expect(primary).toMatch(/<a[^>]*href="\/write\/weekend"/);
  expect(primary).toContain('MuiButton-contained');
});
it('keeps soft chips on the existing tonal palettes', () => {
  const primary = render(h(ToneChip, { label: 'A2', size: 'small', tone: 'primary' }));
  const warning = render(h(ToneChip, { label: 'Review due', tone: 'warning' }));
  expect(primary).toContain('MuiChip-root');
  expect(primary).toContain('A2');
  expect(warning).toContain('MuiChip-colorWarning');
});
it('exposes loading and heading semantics instead of custom markup', () => {
  const loading = render(h(LoadingBar, { label: 'Checking your writing' }));
  expect(loading).toContain('role="progressbar"');
  expect(loading).toContain('aria-label="Checking your writing"');
  expect(loading).toContain('data-ui="loading-bar"');
  const heading = render(h(SectionTitle, { id: 'targets', component: 'h3' }, 'Targets'));
  expect(heading).toMatch(/<h3[^>]*id="targets"/);
  expect(heading).toContain('Targets');
});
it('renders hidden helper text without taking visual space', () => {
  const html = render(h(VisuallyHidden, { role: 'status' }, 'Loading saved writing'));
  expect(html).toContain('role="status"');
  expect(html).toContain('Loading saved writing');
  expect(html).toContain('<span');
});
