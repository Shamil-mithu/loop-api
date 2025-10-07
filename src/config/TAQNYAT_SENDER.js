"use strict";

const assert = require("assert");

const TAQNYAT_SENDER = process.env.TAQNYAT_SENDER || null;

assert(
  typeof TAQNYAT_SENDER === "string",
  "Expected <TAQNYAT_SENDER> to be a valid string",
);

module.exports = TAQNYAT_SENDER;
