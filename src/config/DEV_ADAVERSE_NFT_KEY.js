"use strict";

const assert = require("assert");

const DEV_ADAVERSE_NFT_KEY = process.env.DEV_ADAVERSE_NFT_KEY || null;

assert(
  typeof DEV_ADAVERSE_NFT_KEY === "string",
  "Expected <DEV_ADAVERSE_NFT_KEY> to be a valid string",
);

module.exports = DEV_ADAVERSE_NFT_KEY;
