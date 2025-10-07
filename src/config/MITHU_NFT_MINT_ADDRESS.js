"use strict";

const assert = require("assert");

const MITHU_NFT_MINT_ADDRESS = process.env.MITHU_NFT_MINT_ADDRESS || null;

assert(
  typeof MITHU_NFT_MINT_ADDRESS === "string",
  "Expected <MITHU_NFT_MINT_ADDRESS> to be a valid string",
);

module.exports = MITHU_NFT_MINT_ADDRESS;
