"use strict";

const assert = require("assert");

const SMS_COUNTRY_AUTH_TOKEN = process.env.SMS_COUNTRY_AUTH_TOKEN || null;

assert(
  typeof SMS_COUNTRY_AUTH_TOKEN === "string",
  "Expected <SMS_COUNTRY_AUTH_TOKEN> to be a valid string",
);

module.exports = SMS_COUNTRY_AUTH_TOKEN;
