"use strict";

const {
    getAllMerchantRatingsV1, createMerchantRatingV1, updateMerchantRatingv1, deleteMerchantRatingV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route("/get-all/:merchantId").post(getAllMerchantRatingsV1);

router.route('/create/:merchantId')
    .post(createMerchantRatingV1)

router.route('/:ratingId')
    .put(updateMerchantRatingv1)

router.route('/:ratingId')
    .delete(deleteMerchantRatingV1)

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/rating", router);