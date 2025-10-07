"use strict";

const {
getAllCategoriesV1,
getMerchantsByCategoryIdV1,

getAllCategoriesPublicWebV1,
getMerchantsByCategoryIdPublicWebV1
} = require("@src/controllers");
const { Router } = require("express");
const { chooseController } = require("@src/utils");

const router = Router();

router.route('/get-all')
    .get(chooseController(getAllCategoriesV1, getAllCategoriesPublicWebV1))

router.route('/merchant')
    .post(chooseController(getMerchantsByCategoryIdV1, getMerchantsByCategoryIdPublicWebV1))




// // -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/category", router);