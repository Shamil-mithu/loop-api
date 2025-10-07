"use strict"

const { response } = require('@src/utils')
function isLoggedIn() {
    return function (req, res, next) {
        console.log("logged in as (username) : ", req.username)
        next();
    };
}

module.exports = isLoggedIn;
