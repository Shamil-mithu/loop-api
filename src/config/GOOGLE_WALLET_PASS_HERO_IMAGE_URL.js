"use strict";

const assert = require("assert");

const GOOGLE_WALLET_PASS_HERO_IMAGE_URL = process.env.GOOGLE_WALLET_PASS_HERO_IMAGE_URL || null;

assert(
  typeof GOOGLE_WALLET_PASS_HERO_IMAGE_URL === "string",
  "Expected <GOOGLE_WALLET_PASS_HERO_IMAGE_URL> to be a valid string",
);

module.exports = GOOGLE_WALLET_PASS_HERO_IMAGE_URL;
