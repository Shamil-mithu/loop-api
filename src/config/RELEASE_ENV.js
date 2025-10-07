"use strict";

const { RELEASE } = require("@src/constants");
const assert = require("assert");

const RELEASE_ENV = process.env.RELEASE_ENV || RELEASE.STAGING;

assert(
  Object.values(RELEASE).includes(RELEASE_ENV),
  `Expected <RELEASE_ENV> to be a valid string (${ Object.values(RELEASE) })`,
);

module.exports = RELEASE_ENV;
