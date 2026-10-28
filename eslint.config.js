import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Generated folders are never linted
  globalIgnores(['dist', 'coverage']),

  // Frontend: React code that runs in the BROWSER
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser, // window, document, fetch...
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // Backend, tests and config files: code that runs in NODE.JS
  {
    files: ['server/**/*.js', 'tests/**/*.js', '*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node, // process, console, URL...
    },
  },
])
