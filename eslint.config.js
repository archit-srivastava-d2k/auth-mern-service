// eslint.config.js
const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");

module.exports = defineConfig([
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.js"],
    plugins: {
      js,
    },
    extends: ["js/recommended"],
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
    },
  },
]);
