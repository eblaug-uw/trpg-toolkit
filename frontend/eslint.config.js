import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  // Files / dirs to skip entirely
  {
    ignores: [
      "dist",
      "build",
      "coverage",
      "node_modules",
      "public",
      "*.min.js",
      "vite.config.js",
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // Type-aware TS rules
  ...tseslint.configs.recommendedTypeChecked,

  // App source: TS + React
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // React 19 / new JSX transform
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/prop-types": "off",

      // Vite HMR friendliness
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // Sensible TS defaults
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": "warn",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
    },
    settings: { react: { version: "detect" } },
  },

  // Tests: relax a couple of rules + add jest-dom globals
  {
    files: [
      "src/**/*.{test,spec}.{ts,tsx,js,jsx}",
      "tests/**/*.{ts,tsx,js,jsx}",
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest, ...globals.vitest },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // Must come last — turns off any rules that conflict with Prettier
  prettier,
];