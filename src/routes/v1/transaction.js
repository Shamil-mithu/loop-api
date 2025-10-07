"use strict";

const {
    getAllTransactionsV1,getAllTransactionsOfAMerchantV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .post(getAllTransactionsV1)

router.route('/get-all/:merchantId')
    .post(getAllTransactionsOfAMerchantV1)

// // -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/transaction", router);