"use strict";

const assert = require("assert");

const GCP_ISSUER_ID = process.env.GCP_ISSUER_ID || null;

assert(
  typeof GCP_ISSUER_ID === "string",
  "Expected <GCP_ISSUER_ID> to be a valid string",
);

module.exports = GCP_ISSUER_ID;
