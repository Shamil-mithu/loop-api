"use strict";

const assert = require("assert");

const FACEBOOK_GRAPH_HEADER_TOKEN = process.env.FACEBOOK_GRAPH_HEADER_TOKEN || null;

assert(
  typeof FACEBOOK_GRAPH_HEADER_TOKEN === "string",
  "Expected <FACEBOOK_GRAPH_HEADER_TOKEN> to be a valid string",
);

module.exports = FACEBOOK_GRAPH_HEADER_TOKEN;
