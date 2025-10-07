"use strict";

const {
    getAllLanguageV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .get(getAllLanguageV1)


// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/language", router);