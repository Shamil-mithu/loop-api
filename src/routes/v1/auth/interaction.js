"use strict";

const {
  userLogoutController,
    postLoginInteractionController,
  postRegisterInteractionController,
    verifyLoginOtpInteractionController,
  loginWithTaqnyatController,
  loginWithWhatsappController
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route("/login").post(postLoginInteractionController);

router.route("/login/whatsapp")
    .post(loginWithWhatsappController);

router.route("/login/sms")
    .post(loginWithTaqnyatController);

router.route("/register")
    .post(postRegisterInteractionController);

router.route("/confirm")
  .post(verifyLoginOtpInteractionController);

router.route("/logout")
  .get(userLogoutController);

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/interaction", router);


// 