"use strict";

const { getAlllEngineRulesV1Controller,showEngineRulesV1Controller } = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route("/get-all").get(getAlllEngineRulesV1Controller);
router.route("/merchant/:merchantId").get(showEngineRulesV1Controller);

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/engine-rule", router);
