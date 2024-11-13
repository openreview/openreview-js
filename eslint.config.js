import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ['**/node_modules', '**/scripts'],
}, ...compat.extends('airbnb-base'), {
    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.mocha,
        },

        ecmaVersion: 13,
        // sourceType: 'commonjs',
    },

    rules: {
        'no-use-before-define': ['error', {
            functions: false,
            classes: false,
        }],

        'no-unused-vars': ['error', {
            vars: 'all',
            args: 'none',
            ignoreRestSiblings: false,
            caughtErrors: 'none',
        }],

        camelcase: ['error', {
            properties: 'always',
            ignoreDestructuring: false,
        }],

        strict: ['off'],
        'quote-props': ['off'],
        'max-classes-per-file': ['off'],
        'no-await-in-loop': ['off'],
        'array-bracket-spacing': ['off'],
        'arrow-body-style': ['off'],
        'arrow-parens': ['off'],
        'class-methods-use-this': ['off'],
        'comma-dangle': ['off'],
        'comma-spacing': ['off'],
        'consistent-return': ['off'],
        'func-names': ['off'],
        'function-paren-newline': ['off'],
        'global-require': ['off'],
        'guard-for-in': ['off'],
        indent: ['off'],
        'key-spacing': ['off'],
        'max-len': ['off'],
        'newline-per-chained-call': ['off'],
        'no-confusing-arrow': ['off'],
        'no-console': ['off'],
        'no-continue': ['off'],
        'no-else-return': ['off'],
        'no-lonely-if': ['off'],
        'no-mixed-operators': ['off'],
        'no-multi-spaces': ['off'],
        'no-multiple-empty-lines': ['off'],
        'no-param-reassign': ['off'],
        'no-plusplus': ['off'],
        'no-prototype-builtins': ['off'],
        'no-restricted-syntax': ['off'],
        'no-shadow': ['off'],
        'no-underscore-dangle': ['off'],
        'no-unneeded-ternary': ['off'],
        'no-useless-concat': ['off'],
        'no-var': ['off'],
        'object-curly-newline': ['off'],
        'object-curly-spacing': ['off'],
        'object-property-newline': ['off'],
        'object-shorthand': ['off'],
        'operator-assignment': ['off'],
        'operator-linebreak': ['off'],
        'padded-blocks': ['off'],
        'prefer-arrow-callback': ['off'],
        'prefer-const': ['off'],
        'prefer-destructuring': ['off'],
        'prefer-promise-reject-errors': ['off'],
        'prefer-rest-params': ['off'],
        'prefer-object-spread': ['off'],
        'prefer-template': ['off'],
        'space-before-blocks': ['off'],
        'space-before-function-paren': ['off'],
        'space-in-parens': ['off'],
        'space-infix-ops': ['off'],
        'spaced-comment': ['off'],
        'vars-on-top': ['off'],
        'import/extensions': ['off'],
        'import/prefer-default-export': ['off'],
    },
}];