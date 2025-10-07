"use strict";

const { ENV } = require("@src/constants");
const assert = require("assert");
const NODE_ENV = require("./NODE_ENV");

const SHARED_DB_URI = process.env.SHARED_DB_URI || null;

/* istanbul ignore next */
if (NODE_ENV !== ENV.TEST) {
  assert(
    typeof SHARED_DB_URI === "string",
    "Expected <SHARED_DB_URI> to be a valid string",
  );
}

module.exports = SHARED_DB_URI;
