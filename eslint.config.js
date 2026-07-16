export default [
  {
    files: ["shell/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { document: "readonly", EventSource: "readonly", fetch: "readonly", location: "readonly" } },
    rules: { "no-undef": "error", "no-unused-vars": "error" },
  },
  {
    files: ["userland/**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { document: "readonly", HTMLElement: "readonly" } },
    rules: { "no-undef": "error", "no-unused-vars": "error" },
  },
];
