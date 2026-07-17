import tseslint from "typescript-eslint";

export default [
  {
    files: ["shell/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: { "no-undef": "off", "no-unused-vars": "off", "@typescript-eslint/no-unused-vars": "error" },
  },
  {
    files: ["userland/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { document: "readonly", HTMLElement: "readonly" },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: { "no-undef": "off", "no-unused-vars": "off", "@typescript-eslint/no-unused-vars": "error" },
  },
];
