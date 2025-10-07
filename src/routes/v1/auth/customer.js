"use strict";

const {
    isPhoneNumberExistV1, isEmailAlreadyExist, verifyEmailOTPV1
} = require("@src/controllers");
const { Router } = require("express");

// //-----------------------------------Route----------------------------------------------- 

const router = Router();
router.route('/is-email-exist')
    .post(isEmailAlreadyExist)

router.route('/verify-email')
    .post(verifyEmailOTPV1)

router.route('/is-phonenumber-exist')
    .post(isPhoneNumberExistV1)

// // -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/customer", router);