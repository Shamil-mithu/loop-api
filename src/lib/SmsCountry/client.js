"use strict";

const Axios = require("axios");
const { SMS_COUNTRY_URI, SMS_COUNTRY_CONCATENATED_KEY } = require("@src/config");

const axios = Axios.create({
    baseURL: SMS_COUNTRY_URI,
    timeout: 3000,
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${SMS_COUNTRY_CONCATENATED_KEY}`
    },
});

module.exports = axios;
