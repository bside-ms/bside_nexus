import { defineConfig, globalIgnores } from 'eslint/config';
import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import react from 'eslint-plugin-react';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import _import from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import unicorn from 'eslint-plugin-unicorn';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default defineConfig([
    globalIgnores(['**/*.json', '**/*.js', '**/next-env.d.ts']),
    {
        plugins: {
            react: fixupPluginRules(react),
            '@typescript-eslint': fixupPluginRules(typescriptEslint),
            import: fixupPluginRules(_import),
            'simple-import-sort': simpleImportSort,
            'unused-imports': unusedImports,
            unicorn,
            'react-hooks': fixupPluginRules(reactHooks),
            jsxA11y,
        },

        extends: fixupConfigRules(
            compat.extends(
                'next',
                'next/core-web-vitals',
                'prettier',
                'eslint:recommended',
                'plugin:react/recommended',
                'plugin:react/jsx-runtime',
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
                'plugin:@typescript-eslint/recommended-requiring-type-checking',
                'plugin:react-hooks/recommended',
                'plugin:jsx-a11y/recommended',
            ),
        ),

        linterOptions: {
            reportUnusedDisableDirectives: true,
        },

        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },

            parser: tsParser,
            ecmaVersion: 5,
            sourceType: 'module',

            parserOptions: {
                project: 'tsconfig.json',

                ecmaFeatures: {
                    jsx: true,
                },
            },
        },

        settings: {
            react: {
                version: 'detect',
            },

            'import/extensions': ['.ts', '.tsx'],

            'import/parsers': {
                '@typescript-eslint/parser': ['.ts', '.tsx'],
            },

            'import/cache': 'Infinity',
        },

        rules: {
            'arrow-parens': [0, 'as-needed'],
            'comma-dangle': 0,
            complexity: 0,
            curly: 2,
            'default-param-last': 0,
            'dot-notation': 0,
            eqeqeq: [2, 'always'],
            'guard-for-in': 2,
            'id-match': 2,
            'max-classes-per-file': [2, 10],
            'no-bitwise': 2,
            'no-caller': 2,
            'no-console': 2,
            'no-eval': 2,
            'no-extra-bind': 2,
            'no-lone-blocks': 2,
            'no-new-func': 2,
            'no-new-wrappers': 2,
            'no-prototype-builtins': 0,

            'no-restricted-properties': [
                2,
                {
                    object: 'window',
                    property: 'console',
                    message: 'Use the global `console` object instead of the `window.console` property.',
                },
            ],

            'no-return-await': 2,
            'no-sequences': 2,
            'no-shadow': 0,
            'no-template-curly-in-string': 2,
            'no-throw-literal': 2,
            'no-unexpected-multiline': 0,
            'no-unused-expressions': 0,
            'no-useless-return': 2,
            'object-shorthand': 2,
            'one-var': [2, 'never'],
            'prefer-object-spread': 2,
            'prefer-template': 2,
            radix: 2,
            'space-before-blocks': 0,
            'spaced-comment': 2,

            'react/default-props-match-prop-types': [
                2,
                {
                    allowRequiredDefaults: true,
                },
            ],

            'react/display-name': 0,
            'react/jsx-curly-brace-presence': 2,
            'react/jsx-no-bind': 1,
            'react/jsx-no-target-blank': 0,

            'react/jsx-no-useless-fragment': [
                2,
                {
                    allowExpressions: true,
                },
            ],

            'react/no-access-state-in-setstate': 2,
            'react/no-adjacent-inline-elements': 0,
            'react/no-array-index-key': 1,
            'react/no-danger': 2,
            'react/no-deprecated': 0,
            'react/no-did-mount-set-state': 2,
            'react/no-did-update-set-state': 2,
            'react/no-direct-mutation-state': 0,
            'react/no-find-dom-node': 2,

            'react/no-string-refs': [
                2,
                {
                    noTemplateLiterals: true,
                },
            ],

            'react/no-unescaped-entities': 0,
            'react/no-unknown-property': 0,
            'react/no-unsafe': 2,
            'react/no-unused-prop-types': 2,
            'react/no-unused-state': 2,
            'react/prefer-stateless-function': 2,
            'react/prop-types': 0,
            'react/react-in-jsx-scope': 0,
            'react/require-render-return': 0,
            'react/self-closing-comp': 2,

            '@typescript-eslint/array-type': [
                2,
                {
                    default: 'generic',
                },
            ],

            '@typescript-eslint/ban-ts-comment': 2,
            '@typescript-eslint/camelcase': 0,
            '@typescript-eslint/consistent-indexed-object-style': [2, 'record'],

            '@typescript-eslint/consistent-type-assertions': [
                2,
                {
                    assertionStyle: 'as',
                    objectLiteralTypeAssertions: 'allow',
                },
            ],

            '@typescript-eslint/consistent-type-definitions': 2,

            '@typescript-eslint/consistent-type-imports': [
                2,
                {
                    disallowTypeAnnotations: false,
                },
            ],

            '@typescript-eslint/default-param-last': 2,
            '@typescript-eslint/dot-notation': 2,
            '@typescript-eslint/explicit-function-return-type': 1,

            '@typescript-eslint/explicit-member-accessibility': [
                2,
                {
                    accessibility: 'explicit',

                    overrides: {
                        accessors: 'explicit',
                        constructors: 'explicit',
                    },
                },
            ],

            '@typescript-eslint/explicit-module-boundary-types': 2,
            '@typescript-eslint/init-declarations': 2,

            '@typescript-eslint/member-ordering': [
                2,
                {
                    default: [
                        'signature',
                        'public-static-field',
                        'protected-static-field',
                        'private-static-field',
                        'public-field',
                        'protected-field',
                        'private-field',
                        'field',
                        'public-static-get',
                        'protected-static-get',
                        'private-static-get',
                        'public-get',
                        'protected-get',
                        'private-get',
                        'get',
                        'public-constructor',
                        'protected-constructor',
                        'private-constructor',
                        'constructor',
                        'public-static-method',
                        'protected-static-method',
                        'private-static-method',
                        'public-method',
                        'protected-method',
                        'private-method',
                        'method',
                    ],
                },
            ],

            '@typescript-eslint/no-confusing-void-expression': [
                2,
                {
                    ignoreArrowShorthand: true,
                },
            ],

            '@typescript-eslint/no-dupe-class-members': 2,
            '@typescript-eslint/no-explicit-any': 2,
            '@typescript-eslint/no-floating-promises': 0,
            '@typescript-eslint/no-inferrable-types': 0,
            '@typescript-eslint/no-invalid-this': 2,
            '@typescript-eslint/no-loop-func': 2,
            '@typescript-eslint/no-loss-of-precision': 2,
            '@typescript-eslint/no-misused-promises': 0,
            '@typescript-eslint/no-non-null-assertion': 0,
            '@typescript-eslint/no-parameter-properties': 0,

            '@typescript-eslint/no-shadow': [
                2,
                {
                    hoist: 'all',
                },
            ],

            '@typescript-eslint/no-unnecessary-boolean-literal-compare': 2,
            '@typescript-eslint/no-unnecessary-condition': 0,
            '@typescript-eslint/no-unnecessary-type-arguments': 2,
            '@typescript-eslint/no-unnecessary-type-assertion': 2,
            '@typescript-eslint/no-unsafe-assignment': 0,
            '@typescript-eslint/no-unsafe-argument': 1,
            '@typescript-eslint/no-unsafe-call': 1,
            '@typescript-eslint/no-unsafe-member-access': 1,
            '@typescript-eslint/no-unsafe-return': 1,
            '@typescript-eslint/no-unused-expressions': 2,
            '@typescript-eslint/no-unused-vars': 0,
            '@typescript-eslint/no-use-before-define': 2,
            '@typescript-eslint/no-useless-constructor': 2,
            '@typescript-eslint/no-var-requires': 0,
            '@typescript-eslint/non-nullable-type-assertion-style': 2,

            '@typescript-eslint/parameter-properties': [
                1,
                {
                    prefer: 'parameter-property',
                },
            ],

            '@typescript-eslint/prefer-for-of': 2,
            '@typescript-eslint/prefer-function-type': 2,
            '@typescript-eslint/prefer-includes': 2,
            '@typescript-eslint/prefer-nullish-coalescing': 1,
            '@typescript-eslint/prefer-readonly': 2,
            '@typescript-eslint/prefer-reduce-type-parameter': 2,
            '@typescript-eslint/prefer-regexp-exec': 2,
            '@typescript-eslint/prefer-string-starts-ends-with': 2,
            '@typescript-eslint/prefer-ts-expect-error': 2,
            '@typescript-eslint/require-await': 2,

            '@typescript-eslint/restrict-template-expressions': [
                2,
                {
                    allowNumber: true,
                },
            ],

            '@typescript-eslint/strict-boolean-expressions': 1,
            '@typescript-eslint/unbound-method': 0,
            '@typescript-eslint/unified-signatures': 2,
            'unused-imports/no-unused-imports': 2,

            'unused-imports/no-unused-vars': [
                2,
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],

            'import/first': 2,
            'import/newline-after-import': 2,
            'import/no-duplicates': 0,
            'import/order': 0,

            'simple-import-sort/imports': [
                2,
                {
                    groups: [
                        ['^.+\\.s?css$'],
                        [
                            '^react',
                            '^(_http_agent|_http_client|_http_common|_http_incoming|_http_outgoing|_http_server|_stream_duplex|_stream_passthrough|_stream_readable|_stream_transform|_stream_wrap|_stream_writable|_tls_common|_tls_wrap|assert|assert/strict|async_hooks|buffer|child_process|cluster|console|constants|crypto|dgram|diagnostics_channel|dns|dns/promises|domain|events|fs|fs/promises|http|http2|https|inspector|inspector/promises|module|net|os|path|path/posix|path/win32|perf_hooks|process|punycode|querystring|readline|readline/promises|repl|stream|stream/consumers|stream/promises|stream/web|string_decoder|sys|timers|timers/promises|tls|trace_events|tty|url|util|util/types|v8|vm|wasi|worker_threads|zlib)(/|$)',
                            '^(@hookform/resolvers|@juggle/resize-observer|@keycloak/keycloak-admin-client|@mattermost/client|@mattermost/types|@radix-ui/react-avatar|@radix-ui/react-collapsible|@radix-ui/react-dialog|@radix-ui/react-dropdown-menu|@radix-ui/react-hover-card|@radix-ui/react-label|@radix-ui/react-popover|@radix-ui/react-select|@radix-ui/react-separator|@radix-ui/react-slot|@radix-ui/react-tooltip|@tanstack/react-table|axios|class-variance-authority|clsx|cmdk|dotenv|drizzle-orm|geist|lodash-es|lucide-react|next|next-auth|next-themes|pg|react|react-dom|react-hook-form|react-icons|sonner|tailwind-merge|tailwindcss-animate|vaul|zod|@tailwindcss/postcss|@types/eslint|@types/lodash-es|@types/node|@types/pg|@types/react|@types/react-dom|@typescript-eslint/eslint-plugin|@typescript-eslint/parser|@typescript-eslint/utils|drizzle-kit|eslint|eslint-config-next|eslint-config-prettier|eslint-plugin-import|eslint-plugin-react|eslint-plugin-react-hooks|eslint-plugin-simple-import-sort|eslint-plugin-unicorn|eslint-plugin-unused-imports|postcss|prettier|prettier-plugin-tailwindcss|tailwindcss|ts-node|tsx|typescript|typescript-eslint)(/|$|\u0000)',
                            '^\\w/view/\\w(/.*|$)',
                            '^',
                        ],
                    ],
                },
            ],

            'simple-import-sort/exports': 0,
            'unicorn/explicit-length-check': 2,
            'unicorn/no-array-push-push': 2,
            'unicorn/prefer-array-find': 2,
            'unicorn/prefer-array-index-of': 2,
            'unicorn/prefer-array-some': 2,
            'unicorn/prefer-date-now': 2,
            'unicorn/prefer-includes': 2,
            'unicorn/prefer-optional-catch-binding': 2,
            'unicorn/prefer-regexp-test': 2,
        },
    },
]);
