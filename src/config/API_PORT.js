"use strict";

const assert = require("assert");

const API_PORT = +(process.env.PORT || 2133);

assert(
  !Number.isNaN(API_PORT),
  "Expected <API_PORT> to be a valid number",
);

assert(
  API_PORT >= 0,
  "Expected <API_PORT> to be a non-negative number",
);

assert(
  Number.isInteger(API_PORT),
  "Expected <API_PORT> to be a valid integer",
);

module.exports = API_PORT;
