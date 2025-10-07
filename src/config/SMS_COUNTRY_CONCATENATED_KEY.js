
"use strict";

const assert = require("assert");

const SMS_COUNTRY_AUTH_KEY = process.env.SMS_COUNTRY_AUTH_KEY || null;
const SMS_COUNTRY_AUTH_TOKEN = process.env.SMS_COUNTRY_AUTH_TOKEN || null;
const concatenated = `${SMS_COUNTRY_AUTH_KEY}:${SMS_COUNTRY_AUTH_TOKEN}`
const encodedCredentials = Buffer.from(concatenated).toString('base64');

assert(
    typeof encodedCredentials === "string",
    "Expected <encodedCredentials> to be a valid string",
  );
  
  module.exports = encodedCredentials;
  