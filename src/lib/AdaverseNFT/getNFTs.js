"use strict";

const client = require("./client");
const responseHandler = require("@src/lib/responseHandler.js");


function get(offset, limit = 10, order_by, user_address) {
    const queryParameters = [
        `offset=${offset}`,
        `limit=${limit}`,
        order_by ? `order_by=${order_by}` : '',
        user_address ? `user_address=${user_address}` : ''
    ]
    .filter(Boolean) 
    .join('&');

    return responseHandler(client.post(`/nfts?${queryParameters}`));

}

module.exports = {
    get,
};
