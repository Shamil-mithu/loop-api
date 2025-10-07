"use strict";

const client = require("./client");
const responseHandler = require("@src/lib/responseHandler.js");


function checkHealth() {
    return responseHandler(
        client.get(`/healthcheck`)
    )
}

module.exports = {
    checkHealth,
};
