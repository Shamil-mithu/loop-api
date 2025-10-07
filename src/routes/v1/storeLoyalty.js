"use strict";

const {
    getAllStoreLoyalty
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .get(getAllStoreLoyalty)


// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/store-loyalty", router);