"use strict";

const assert = require("assert");

const WHATSAPP_HEADER_TOKEN = process.env.WHATSAPP_HEADER_TOKEN || null;

assert(
  typeof WHATSAPP_HEADER_TOKEN === "string",
  "Expected <WHATSAPP_HEADER_TOKEN> to be a valid string",
);

module.exports = WHATSAPP_HEADER_TOKEN;
