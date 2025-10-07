"use strict";

const assert = require("assert");

const FACEBOOK_GRAPH_PROJECT_ID = process.env.FACEBOOK_GRAPH_PROJECT_ID || null;

assert(
  typeof FACEBOOK_GRAPH_PROJECT_ID === "string",
  "Expected <FACEBOOK_GRAPH_PROJECT_ID> to be a valid string",
);

module.exports = FACEBOOK_GRAPH_PROJECT_ID;
