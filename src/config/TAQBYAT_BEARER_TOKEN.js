"use strict";

const assert = require("assert");

const TAQBYAT_BEARER_TOKEN = process.env.TAQBYAT_BEARER_TOKEN || null;

assert(
  typeof TAQBYAT_BEARER_TOKEN === "string",
  "Expected <TAQBYAT_BEARER_TOKEN> to be a valid string",
);

module.exports = TAQBYAT_BEARER_TOKEN;
