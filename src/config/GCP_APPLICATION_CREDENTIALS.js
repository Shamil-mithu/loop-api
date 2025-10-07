"use strict";

const assert = require("assert");

const GCP_APPLICATION_CREDENTIALS = process.env.GCP_APPLICATION_CREDENTIALS || null;

assert(
  typeof GCP_APPLICATION_CREDENTIALS === "string",
  "Expected <GCP_APPLICATION_CREDENTIALS> to be a valid string",
);

module.exports = GCP_APPLICATION_CREDENTIALS;
