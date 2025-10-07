"use strict";

const Axios = require("axios");
const { WHATSAPP_HEADER_TOKEN } = require("@src/config");

const axios = Axios.create({
    timeout: 60000,
    headers: {
        "Content-Type": "application/json",
        "xt-user-token": `${WHATSAPP_HEADER_TOKEN}`
    },
});

module.exports = axios;
