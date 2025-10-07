"use strict";

const assert = require("assert");

const SMS_COUNTRY_AUTH_KEY = process.env.SMS_COUNTRY_AUTH_KEY || null;

assert(
  typeof SMS_COUNTRY_AUTH_KEY === "string",
  "Expected <SMS_COUNTRY_AUTH_KEY> to be a valid string",
);

module.exports = SMS_COUNTRY_AUTH_KEY;
