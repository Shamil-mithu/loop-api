"use strict";

const assert = require("assert");

const FACEBOOK_GRAPH_URI = process.env.FACEBOOK_GRAPH_URI || null;

assert(
  typeof FACEBOOK_GRAPH_URI === "string",
  "Expected <FACEBOOK_GRAPH_URI> to be a valid string",
);

module.exports = FACEBOOK_GRAPH_URI;
