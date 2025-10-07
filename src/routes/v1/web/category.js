"use strict";

const {
getAllCategoriesPublicWebV1,
getMerchantsByCategoryIdPublicWebV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .get(getAllCategoriesPublicWebV1)

router.route('/merchant')
    .post(getMerchantsByCategoryIdPublicWebV1)




// // -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/category", router);