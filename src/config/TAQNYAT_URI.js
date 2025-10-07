"use strict";

const assert = require("assert");

const TAQNYAT_URI = process.env.TAQNYAT_URI || null;

assert(
  typeof TAQNYAT_URI === "string",
  "Expected <TAQNYAT_URI> to be a valid string",
);

module.exports = TAQNYAT_URI;
