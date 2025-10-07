"use strict";

const assert = require("assert");

const APPLE_NFC_PUBLIC_KEY = process.env.APPLE_NFC_PUBLIC_KEY || null;

assert(
  typeof APPLE_NFC_PUBLIC_KEY === "string",
  "Expected <APPLE_NFC_PUBLIC_KEY> to be a valid string",
);

module.exports = APPLE_NFC_PUBLIC_KEY;
