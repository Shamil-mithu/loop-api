"use strict";

const assert = require("assert");

const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || null;

assert(
  typeof S3_SECRET_ACCESS_KEY === "string",
  "Expected <S3_SECRET_ACCESS_KEY> to be a valid string",
);

module.exports = S3_SECRET_ACCESS_KEY;
