"use strict";

const assert = require("assert");

const S3_BUCKET = process.env.S3_BUCKET || null;

assert(
  typeof S3_BUCKET === "string",
  "Expected <S3_BUCKET> to be a valid string",
);

module.exports = S3_BUCKET;
