import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
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
      "eslint.config.js",
    ],
  },

  // Base JS recommended rules — applies everywhere
  js.configs.recommended,

  // App source: TS + React, with type-aware linting
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2022 },
      parserOptions: {
        projectService: true,
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
      "react/display-name": "off",

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

      // Legacy-friendly: downgrade noisy type-aware rules to warnings
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/restrict-template-expressions": "warn",
      "@typescript-eslint/require-await": "warn",

      // Accessibility (legacy-friendly)
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/label-has-associated-control": "warn",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-dupe-keys": "error", // real bug — keep blocking
      eqeqeq: ["error", "always"],
    },
    settings: { react: { version: "detect" } },
  },

  // Tests
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
);