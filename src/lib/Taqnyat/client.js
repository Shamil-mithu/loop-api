"use strict";

const Axios = require("axios");
const { TAQNYAT_URI,TAQBYAT_BEARER_TOKEN } = require("@src/config");

const axios = Axios.create({
    baseURL: TAQNYAT_URI,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
        "Authorization" : TAQBYAT_BEARER_TOKEN
    }
});

module.exports = axios;
