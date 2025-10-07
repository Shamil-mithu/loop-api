"use strict";

const {
getAllFAQsV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .get(getAllFAQsV1)


// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/faq", router);