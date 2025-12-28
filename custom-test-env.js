const Environment = require("jest-environment-jsdom-global");
const { webcrypto } = require("crypto");

/**
 * A custom environment to set the TextEncoder and crypto
 */
module.exports = class CustomTestEnvironment extends Environment {
  constructor({ globalConfig, projectConfig }, context) {
    super({ globalConfig, projectConfig }, context);
    if (typeof this.global.TextEncoder === "undefined") {
      const { TextEncoder, TextDecoder } = require("util");
      this.global.TextEncoder = TextEncoder;
      this.global.TextDecoder = TextDecoder;
    }
    // Set up webcrypto for the jsdom environment
    if (!this.global.crypto || !this.global.crypto.subtle) {
      this.global.crypto = webcrypto;
    }
  }
};

