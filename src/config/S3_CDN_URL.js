"use strict";

const assert = require("assert");

const S3_CDN_URL = process.env.S3_CDN_URL || null;

assert(
  typeof S3_CDN_URL === "string",
  "Expected <S3_CDN_URL> to be a valid string",
);

module.exports = S3_CDN_URL;
