"use strict";

const assert = require("assert");

const WEBSITE_DOMAIN = process.env.WEBSITE_DOMAIN || null;

assert(
  typeof WEBSITE_DOMAIN === "string",
  "Expected <WEBSITE_DOMAIN> to be a valid string",
);

const WEBSITE_URI = `https://${ WEBSITE_DOMAIN }`;

module.exports = {
  WEBSITE_DOMAIN,
  WEBSITE_URI,
};
