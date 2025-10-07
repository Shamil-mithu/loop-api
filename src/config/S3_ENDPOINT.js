"use strict";

const assert = require("assert");

const S3_ENDPOINT = process.env.S3_ENDPOINT || null;

assert(
  typeof S3_ENDPOINT === "string",
  "Expected <S3_ENDPOINT> to be a valid string",
);

module.exports = S3_ENDPOINT;
