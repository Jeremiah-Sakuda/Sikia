export default [
  {
    files: ["shell/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { document: "readonly", EventSource: "readonly", fetch: "readonly", location: "readonly" } },
    rules: { "no-undef": "error", "no-unused-vars": "error" },
  },
];
