"use strict";

const assert = require("assert");

const WHATSAPP_URI = process.env.WHATSAPP_URI || null;

assert(
  typeof WHATSAPP_URI === "string",
  "Expected <WHATSAPP_URI> to be a valid string",
);

module.exports = WHATSAPP_URI;
