"use strict";

const {
  getSpinMachineData,
  getSlotMachineData,
  earnGamificationPoints,
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route("/spin-wheel").get(getSpinMachineData);

router.route("/slot-machine").get(getSlotMachineData);

router.route("/earning").post(earnGamificationPoints);

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/gamification", router);
