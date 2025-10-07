"use strict";

const assert = require("assert");

const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || null;

assert(
  typeof S3_ACCESS_KEY_ID === "string",
  "Expected <S3_ACCESS_KEY_ID> to be a valid string",
);

module.exports = S3_ACCESS_KEY_ID;
