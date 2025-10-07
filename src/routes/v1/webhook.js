"use strict";

const {
    vtapWebhookControllerV1,
    googleCallbackControllerV1
} = require("@src/controllers");
const { Router } = require("express");
const { google } = require("googleapis");

const router = Router();

router.route('/vtap')
    .post(vtapWebhookControllerV1)

router.route('/google/callback')
    .post(googleCallbackControllerV1)

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/webhook", router);