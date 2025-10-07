"use strict";

const assert = require("assert");

const APPLE_APN_KEY_NAME = process.env.APPLE_APN_KEY_NAME || null;

assert(
  typeof APPLE_APN_KEY_NAME === "string",
  "Expected <APPLE_APN_KEY_NAME> to be a valid string",
);

module.exports = APPLE_APN_KEY_NAME;
