"use strict";

const assert = require("assert");

const APPLE_APN_KEY_PATH = process.env.APPLE_APN_KEY_PATH || null;

assert(
  typeof APPLE_APN_KEY_PATH === "string",
  "Expected <APPLE_APN_KEY_PATH> to be a valid string",
);

module.exports = APPLE_APN_KEY_PATH;
