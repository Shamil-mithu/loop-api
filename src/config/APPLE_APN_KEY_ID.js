"use strict";

const assert = require("assert");

const APPLE_APN_KEY_ID = process.env.APPLE_APN_KEY_ID || null;

assert(
  typeof APPLE_APN_KEY_ID === "string",
  "Expected <APPLE_APN_KEY_ID> to be a valid string",
);

module.exports = APPLE_APN_KEY_ID;
