"use strict";

const {
    getAllLocalizationV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .get(getAllLocalizationV1)

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/localization", router);