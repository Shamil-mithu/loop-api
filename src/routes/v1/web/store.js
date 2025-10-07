"use strict";

const {
    getStoresV1PublicWebV1, getStoreTagsV1, getStoreCategoriesV1, saveAStoreV1,
    getSavedStoresV1, getStoresByCategoryIdV1, showStorePublicWebV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .get(getStoresV1PublicWebV1)

router.route('/:store_id')
    .get(showStorePublicWebV1)

router.route('/get-by-category')
    .post(getStoresByCategoryIdV1)

router.route('/tag/get-all')
    .get(getStoreTagsV1)

router.route('/category/get-all')
    .get(getStoreCategoriesV1)

router.route('/save')
    .post(saveAStoreV1)

router.route('/saved/get-all')
    .get(getSavedStoresV1)


// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/store", router);