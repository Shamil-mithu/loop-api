"use strict";

const assert = require("assert");

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || null;

assert(
  typeof SENDGRID_API_KEY === "string",
  "Expected <SENDGRID_API_KEY> to be a valid string",
);

module.exports = SENDGRID_API_KEY;
