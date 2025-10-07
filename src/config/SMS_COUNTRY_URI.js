"use strict";

const assert = require("assert");

const SMS_COUNTRY_URI = process.env.SMS_COUNTRY_URI || null;

assert(
  typeof SMS_COUNTRY_URI === "string",
  "Expected <SMS_COUNTRY_URI> to be a valid string",
);

module.exports = SMS_COUNTRY_URI;
