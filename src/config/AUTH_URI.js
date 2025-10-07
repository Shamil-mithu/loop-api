"use strict";

const assert = require("assert");

const AUTH_URI = process.env.BASE_URL || null;

assert(
  typeof AUTH_URI === "string",
  "Expected <AUTH_URI> to be a valid string",
);

module.exports = AUTH_URI;
