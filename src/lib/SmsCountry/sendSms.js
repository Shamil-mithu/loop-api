"use strict";

const client = require("./client");
const responseHandler = require("@src/lib/responseHandler.js");
const { SMS_COUNTRY_AUTH_KEY } = require("@src/config");


function send(text, number) {
    return responseHandler(
        client.post(`/v0.1/Accounts/${SMS_COUNTRY_AUTH_KEY}/SMSes/`,
            {
                "Text": text,
                "Number": number,
                "SendId": "Mithu",
                "Tool": "API"
            }
        )
    )
}

module.exports = {
    send,
};
