import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const forbidden = [
  /^tailwindcss$/,
  /^@tailwindcss\//,
  /^@radix-ui\//,
  /^@headlessui\//,
  /^@chakra-ui\//,
  /^@mantine\//,
  /^antd$/,
  /^@ant-design\//,
  /^react-bootstrap$/,
  /^bootstrap$/,
  /^styled-components$/,
  /^lucide-react$/,
  /^react-icons$/,
  /^@heroicons\//,
  /^@fortawesome\//,
  /^recharts$/,
  /^chart\.js$/,
  /^react-chartjs-2$/,
  /^class-variance-authority$/,
  /^tailwind-merge$/,
  /^sonner$/,
  /^react-hot-toast$/,
];
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const problems = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
  .filter((name) => forbidden.some((pattern) => pattern.test(name)))
  .map((name) => 'Forbidden dependency: ' + name);
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(css|scss|sass|less)$/.test(path)) problems.push('Stylesheet not allowed: ' + path);
  }
}
walk('src');
for (const file of ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'])
  if (existsSync(file)) problems.push('Remove ' + file);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Design rules: OK');
