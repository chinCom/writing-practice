import { expect, it } from 'vitest';
import { hintTerms, splitHintText } from '@/lib/hint-text';
it('emphasizes exact suggested language, not instructions or unrelated substrings', () => {
  const text = 'Use let before a base verb like unwind.';
  expect(hintTerms(text, 'let my head unwind')).toEqual(['let', 'unwind']);
  expect(
    splitHintText(text, ['let', 'unwind'])
      .filter((part) => part.highlight)
      .map((part) => part.text),
  ).toEqual(['let', 'unwind']);
  expect(splitHintText('The letter is correct.', ['let']).every((part) => !part.highlight)).toBe(
    true,
  );
  expect(
    splitHintText('Use <script> literally.', ['<script>'])
      .map((part) => part.text)
      .join(''),
  ).toBe('Use <script> literally.');
});
