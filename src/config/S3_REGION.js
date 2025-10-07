"use strict";

const assert = require("assert");

const S3_REGION = process.env.S3_REGION || null;

assert(
  typeof S3_REGION === "string",
  "Expected <S3_REGION> to be a valid string",
);

module.exports = S3_REGION;
