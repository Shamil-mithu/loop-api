"use strict";

const assert = require("assert");

const WEBSOCKET_URL = process.env.WEBSOCKET_URL || null;

assert(
  typeof WEBSOCKET_URL === "string",
  "Expected <WEBSOCKET_URL> to be a valid string",
);

module.exports = WEBSOCKET_URL;
