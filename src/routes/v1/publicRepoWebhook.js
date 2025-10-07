"use strict";

const {
    claimNFTMembershipthroughWebhook
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route('/claim-membership')
    .post(claimNFTMembershipthroughWebhook)


// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/public", router);