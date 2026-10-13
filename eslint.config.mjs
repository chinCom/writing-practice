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
      'no-restricted-imports': [
        'error',
        {
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
        },
      ],
    },
  },
  { files: ['src/theme/**'], rules: { 'no-restricted-syntax': ['error', raw, style, classes] } },
  {
    files: ['src/app/layout.tsx'],
    rules: { 'no-restricted-syntax': ['error', style, hex, colors, muiSelectors] },
  },
];
export default config;
