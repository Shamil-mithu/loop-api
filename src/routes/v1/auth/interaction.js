"use strict";

const {
  userLogoutController,
  postLoginInteractionController,
  postRegisterInteractionControllerV1,
  verifyLoginOtpInteractionController,
  loginWithTaqnyatController,
  loginWithWhatsappController,
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route("/login")
  .post(postLoginInteractionController);

router.route("/login/whatsapp")
  .post(loginWithWhatsappController);

router.route("/login/sms")
  .post(loginWithTaqnyatController);

router.route("/confirm")
  .post(verifyLoginOtpInteractionController);

router.route("/logout")
  .get(userLogoutController);

router.route("/register")
  .post(postRegisterInteractionControllerV1);

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/interaction", router);


// 