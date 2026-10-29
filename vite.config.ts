import { defineConfig } from 'vite-plus'

const generatedPaths = [
  '**/dist/**',
  '**/coverage/**',
  '**/.output/**',
  '**/.tanstack/**',
  '**/.nitro/**',
  'packages/client/src/routeTree.gen.ts',
]

export default defineConfig({
  fmt: {
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 80,
    sortImports: {},
    sortTailwindcss: {
      stylesheet: './packages/client/src/styles.css',
      functions: ['clsx', 'cn', 'cva'],
    },
    ignorePatterns: [
      '**/*.yml',
      '**/*.yaml',
      'pnpm-lock.yaml',
      'docs/**',
      '.claude/**',
      ...generatedPaths,
    ],
  },
  staged: {
    '*': 'vp check --fix',
    '.github/**/*.{yml,yaml}': 'scripts/lint-actions.sh',
  },
  lint: {
    ignorePatterns: [...generatedPaths, '.claude/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    plugins: ['typescript', 'import', 'unicorn'],
    categories: {
      correctness: 'error',
      suspicious: 'error',
      perf: 'error',
    },
    rules: {
      'typescript/ban-ts-comment': 'error',
      'typescript/consistent-type-imports': 'error',
      'typescript/method-signature-style': ['error', 'property'],
      'typescript/no-inferrable-types': 'error',
      'typescript/no-namespace': 'error',
      'typescript/no-unsafe-function-type': 'error',
      'typescript/prefer-for-of': 'error',
      'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-commonjs': 'error',
      'import/no-duplicates': 'error',
      'import/no-default-export': 'error',
      'no-case-declarations': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: ['@tanstack/react-form', '@tanstack/react-store'].map(
            (name) => ({
              name,
              importNames: ['useStore'],
              message:
                'Deprecated alias; use useSelector (same args, pass `{ compare }` as 3rd arg).',
            }),
          ),
        },
      ],
      'no-fallthrough': 'error',
      'no-regex-spaces': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'unicorn/prefer-node-protocol': 'error',

      'typescript/no-unsafe-type-assertion': 'off',
      'no-await-in-loop': 'off',
      'no-underscore-dangle': 'off',
      'unicorn/prefer-set-has': 'off',
    },
    overrides: [
      {
        // Tools that load these files expect a default export: config files,
        // and the TanStack Start entry points (src/{client,server,start}).
        files: [
          '**/*.config.{ts,mts,js,mjs}',
          'packages/client/src/{client,server,start}.{ts,tsx}',
        ],
        rules: {
          'import/no-default-export': 'off',
        },
      },
      {
        files: ['packages/client/**/*.{ts,tsx}'],
        plugins: ['react', 'jsx-a11y'],
        env: { browser: true },
        rules: {
          'react/react-in-jsx-scope': 'off',
          'typescript/consistent-return': 'off',
          'react/incompatible-library': 'warn',
          'react/no-array-index-key': 'warn',
        },
      },
      {
        // shadcn/ui primitives are vendored as generated; keep diffs minimal
        files: ['packages/client/src/components/ui/**'],
        rules: {
          'react/no-array-index-key': 'off',
          'jsx-a11y/heading-has-content': 'off',
        },
      },
      {
        files: ['**/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
        plugins: ['vitest'],
        rules: {
          'vitest/require-mock-type-parameters': 'off',
          'typescript/no-misused-spread': 'off',
        },
      },
    ],
  },
})
