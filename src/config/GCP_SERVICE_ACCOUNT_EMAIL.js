"use strict";

const assert = require("assert");

const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL || null;

assert(
  typeof GCP_SERVICE_ACCOUNT_EMAIL === "string",
  "Expected <GCP_SERVICE_ACCOUNT_EMAIL> to be a valid string",
);

module.exports = GCP_SERVICE_ACCOUNT_EMAIL;
