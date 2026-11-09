const parser = require('@typescript-eslint/parser');
const plugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: { parser, parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname } },
    plugins: { '@typescript-eslint': plugin },
    rules: { ...plugin.configs.recommended.rules, '@typescript-eslint/no-explicit-any': 'off' },
  },
];
