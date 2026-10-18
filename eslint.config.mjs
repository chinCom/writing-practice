import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
const raw = {
  selector: 'JSXOpeningElement[name.name=/^[a-z]/]',
  message: 'Use MUI components, not raw UI tags (DESIGN.md §1).',
};
const style = { selector: "JSXAttribute[name.name='style']", message: 'Use sx or the MUI theme.' };
const classes = {
  selector: "JSXAttribute[name.name='className']",
  message: 'Use sx or the MUI theme.',
};
const hex = {
  selector: 'Literal[value=/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
  message: 'Colors belong in src/theme.',
};
const colors = {
  selector: 'Literal[value=/^(rgb|rgba|hsl|hsla)\\(/]',
  message: 'Use palette tokens.',
};
const muiSelectors = {
  selector: 'Literal[value=/\\.Mui[A-Z]/]',
  message: 'MUI internal selectors belong in src/theme.',
};
const restrictedImports = {
  paths: [
    { name: '@mui/icons-material', message: 'Import icons by path.' },
    { name: '@emotion/react', message: 'Use MUI styling.' },
    { name: '@emotion/styled', message: 'Use MUI styling.' },
  ],
  patterns: [
    {
      group: [
        'tailwindcss*',
        '@radix-ui/*',
        '@headlessui/*',
        '@chakra-ui/*',
        '@mantine/*',
        'antd',
        '@ant-design/*',
        'bootstrap',
        'react-bootstrap',
        'styled-components',
        'lucide-react',
        'react-icons*',
        '@heroicons/*',
        '@fortawesome/*',
        'recharts',
        'chart.js',
        'react-chartjs-2',
        'class-variance-authority',
        'tailwind-merge',
        'sonner',
        'react-hot-toast',
      ],
      message: 'UI must be MUI-only.',
    },
  ],
};
const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', raw, style, classes, hex, colors, muiSelectors],
      'no-restricted-imports': ['error', restrictedImports],
    },
  },
  {
    files: ['src/lib/db/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          ...restrictedImports,
          patterns: [
            ...restrictedImports.patterns,
            {
              group: ['@/lib/api', '../api', '@/lib/llm/**', '../llm/**', 'next/**'],
              message:
                'Database operations use domain errors and explicit result contracts, not HTTP or provider adapters.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/feedback/ConnectorLayer.tsx'],
    rules: { 'no-restricted-syntax': ['error', classes, hex, colors, muiSelectors] },
  },
  {
    files: [
      'src/components/studio/ReadSweep.tsx',
      'src/components/studio/DevelopmentSuggestion.tsx',
    ],
    rules: { 'no-restricted-syntax': ['error', raw, classes, hex, colors, muiSelectors] },
  },
  { files: ['src/theme/**'], rules: { 'no-restricted-syntax': ['error', raw, style, classes] } },
  {
    files: ['src/components/ui/icons/**'],
    rules: { 'no-restricted-syntax': ['error', style, colors, muiSelectors] },
  },
  {
    files: ['src/app/layout.tsx'],
    rules: { 'no-restricted-syntax': ['error', style, hex, colors, muiSelectors] },
  },
];
export default config;
