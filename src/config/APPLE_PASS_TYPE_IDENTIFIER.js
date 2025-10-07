"use strict";

const assert = require("assert");

const APPLE_PASS_TYPE_IDENTIFIER = process.env.APPLE_PASS_TYPE_IDENTIFIER || null;

assert(
  typeof APPLE_PASS_TYPE_IDENTIFIER === "string",
  "Expected <APPLE_PASS_TYPE_IDENTIFIER> to be a valid string",
);

module.exports = APPLE_PASS_TYPE_IDENTIFIER;
