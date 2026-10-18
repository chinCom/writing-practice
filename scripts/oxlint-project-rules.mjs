// Oxlint has no native no-restricted-syntax rule. Keep the existing design selectors.
const projectRules = {
  meta: { name: 'project' },
  rules: {
    'restricted-syntax': {
      meta: { schema: { type: 'array', items: { type: 'object' } } },
      create(context) {
        return Object.fromEntries(
          context.options.map(({ selector, message }) => [
            selector,
            (node) => context.report({ node, message }),
          ]),
        );
      },
    },
  },
};

export default projectRules;
