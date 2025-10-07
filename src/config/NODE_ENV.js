"use strict";

const { ENV } = require("@src/constants");
const assert = require("assert");

const NODE_ENV = process.env.NODE_ENV || ENV.DEVELOPMENT;

assert(
  Object.values(ENV).includes(NODE_ENV),
  `Expected <NODE_ENV> to be a valid string (${ Object.values(ENV) })`,
);

module.exports = NODE_ENV;
