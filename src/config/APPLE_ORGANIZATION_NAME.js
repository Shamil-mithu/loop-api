"use strict";

const assert = require("assert");

const APPLE_ORGANIZATION_NAME = process.env.APPLE_ORGANIZATION_NAME || null;

assert(
  typeof APPLE_ORGANIZATION_NAME === "string",
  "Expected <APPLE_ORGANIZATION_NAME> to be a valid string",
);

module.exports = APPLE_ORGANIZATION_NAME;
