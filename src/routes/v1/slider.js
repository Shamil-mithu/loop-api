"use strict";

const {
    getAllSliderV1,
    getAllSliderPublicWebV1
} = require("@src/controllers");
const { Router } = require("express");
const { chooseController } = require("@src/utils");
const router = Router();

router.route('/get-all')
    .get(chooseController(getAllSliderV1, getAllSliderPublicWebV1))

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/slider", router);