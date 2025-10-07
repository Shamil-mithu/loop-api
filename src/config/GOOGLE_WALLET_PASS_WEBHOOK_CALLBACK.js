"use strict";

const assert = require("assert");

const GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK = process.env.GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK || null;

assert(
  typeof GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK === "string",
  "Expected <GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK> to be a valid string",
);

module.exports = GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK;
