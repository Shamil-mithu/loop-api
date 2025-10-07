"use strict";

const {
    getAllCitiesV1, getAllCountriesV1, getAllStatesV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/country/get-all')
    .post(getAllCountriesV1)

router.route('/city/get-all/')
    .post(getAllCitiesV1)

router.route('/state/get-all/')
    .post(getAllStatesV1)

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/region", router);