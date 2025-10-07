"use strict";

const Axios = require("axios");
const { DEV_ADAVERSE_NFT_URL,DEV_ADAVERSE_NFT_KEY,MITHU_NFT_MINT_ADDRESS } = require("@src/config");


const axios = Axios.create({
    baseURL: DEV_ADAVERSE_NFT_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        "x-api-key": `${DEV_ADAVERSE_NFT_KEY}`
    },
});

module.exports = axios;
