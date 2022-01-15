const fs = require("fs");
const Environment = require("jest-environment-jsdom");

/**
 * A custom environment to set the TextEncoder.
 */
module.exports = class CustomTestEnvironment extends Environment {
  async setup() {
    fs.copyFileSync(
      "pvutils-tests-replacement.js",
      "node_modules/pvutils/build/utils.js"
    );

    await super.setup();
    if (typeof this.global.TextEncoder === "undefined") {
      const { TextEncoder } = require("util");
      this.global.TextEncoder = TextEncoder;
    }
    if (typeof this.global.TextDecoder === "undefined") {
      const { TextDecoder } = require("util");
      this.global.TextDecoder = TextDecoder;
    }
  }
};
