"use strict";

const {
    getAllSliderPublicWebV1,
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .get(getAllSliderPublicWebV1)

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/slider", router);