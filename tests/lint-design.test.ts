import { expect, it } from 'vitest';
import { lintSource } from './helpers/lint-source';

it.each([
  '<div />',
  '<Box style={{}} />',
  '<Box className="custom" />',
  '<Box sx={{ color: "#fff" }} />',
  '<Box sx={{ color: "rgb(0,0,0)" }} />',
  '<Box sx={{ "& .MuiButton-root": {} }} />',
])('rejects UI design violation %s', async (element) => {
  const messages = await lintSource(`export const Example = () => (${element});`);
  expect(messages.filter((message) => message.code === 'project(restricted-syntax)')).toHaveLength(
    1,
  );
});

it('allows MUI components with palette tokens', async () => {
  const messages = await lintSource(
    'export const Example = () => <Box sx={{ color: "text.primary" }} />;',
  );
  expect(messages.filter((message) => message.code === 'project(restricted-syntax)')).toEqual([]);
});
