"use strict";

const client = require("./client");
const responseHandler = require("@src/lib/responseHandler.js");
const { MITHU_NFT_MINT_ADDRESS } = require('@src/config')

function mint(token_uri, token_name, token_symbol) {
    return responseHandler(
        client.post(`/nfts/mint`,
            {
                "receiver_address": `${MITHU_NFT_MINT_ADDRESS}`,
                "token_uri": `${token_uri}`,
                "token_name": `${token_name}`,
                "token_symbol": `${token_symbol}`
            }
        )
        , 'adaverse')
}

module.exports = {
    mint,
};
