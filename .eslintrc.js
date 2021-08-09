module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
    jest: true,
  },
  globals: {
    page: true,
    browser: true,
    crypto: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    allowEmptyCatch: 0,
    "no-cond-assign": 0,
    "no-console": "off",
    "no-redeclare": "warn",
    "no-duplicate-imports": "warn",
    "no-undef": "error",
    "no-global-assign": "warn",
    "no-empty": "warn",
    "no-underscore-dangle": "off",
    "object-shorthand": 0,
    complexity: ["warn", 40],
    "max-statements": ["warn", 100],
    eqeqeq: "off",
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "never",
        ts: "never",
      },
    ],
    "prettier/prettier": [
      "warn",
      {
        endOfLine: "auto",
      },
    ],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/ban-ts-ignore": "off",
    "@typescript-eslint/interface-name-prefix": "off",
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".ts"],
      },
    },
    "import/ignore:": [".scss$"],
  },
  parser: "@typescript-eslint/parser",
  extends: [
    "airbnb-base",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["jest", "import", "prettier"],
};
