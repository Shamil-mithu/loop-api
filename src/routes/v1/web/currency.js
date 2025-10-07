"use strict";

const { getAllCurrenciesV1 } = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route("/get-all").get(getAllCurrenciesV1);

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/currency", router);
