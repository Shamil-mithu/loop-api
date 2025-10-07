"use strict";

const assert = require("assert");

const APPLE_WALLET_WEBSERVICE_URL = process.env.APPLE_WALLET_WEBSERVICE_URL || null;

assert(
  typeof APPLE_WALLET_WEBSERVICE_URL === "string",
  "Expected <APPLE_WALLET_WEBSERVICE_URL> to be a valid string",
);

module.exports = APPLE_WALLET_WEBSERVICE_URL;
