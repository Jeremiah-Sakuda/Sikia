import tseslint from "typescript-eslint";

export default [
  {
    files: ["shell/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { document: "readonly", EventSource: "readonly", fetch: "readonly", location: "readonly" } },
    rules: { "no-undef": "error", "no-unused-vars": "error" },
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
