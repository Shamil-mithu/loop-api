"use strict";

const {
    updloadManualReceiptV1Controller,
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

// router.route('/get-all')
//     .get(getAllManualReceiptsV1)

router.route('/upload')
    .post(updloadManualReceiptV1Controller)

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/manual-receipt", router);