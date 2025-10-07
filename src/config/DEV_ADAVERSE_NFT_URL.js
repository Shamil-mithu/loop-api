"use strict";

const assert = require("assert");

const DEV_ADAVERSE_NFT_URL = process.env.DEV_ADAVERSE_NFT_URL || null;

assert(
  typeof DEV_ADAVERSE_NFT_URL === "string",
  "Expected <DEV_ADAVERSE_NFT_URL> to be a valid string",
);

module.exports = DEV_ADAVERSE_NFT_URL;
