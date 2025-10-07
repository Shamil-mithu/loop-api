"use strict";

const assert = require("assert");

const APPLE_TEAM_IDENTIFIER = process.env.APPLE_TEAM_IDENTIFIER || null;

assert(
  typeof APPLE_TEAM_IDENTIFIER === "string",
  "Expected <APPLE_TEAM_IDENTIFIER> to be a valid string",
);

module.exports = APPLE_TEAM_IDENTIFIER;
