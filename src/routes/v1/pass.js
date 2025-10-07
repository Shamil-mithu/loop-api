"use strict";

const {
    createAppleWalletPassV1Controller,
    createGoogleWalletPassV1Controller,
    updateGoogleWalletPassV1Controller
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/apple-wallet')
    .post(createAppleWalletPassV1Controller)

router.route('/google-wallet')
    .post(createGoogleWalletPassV1Controller) // Assuming the same controller is used for Google Wallet

router.route('/google-wallet')
    .put(updateGoogleWalletPassV1Controller) // Assuming the same controller is used for Google Wallet
// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/pass", router);