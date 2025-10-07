"use strict";

const {
getAllNotificationsV1
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/get-all')
    .post(getAllNotificationsV1)

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/notification", router);