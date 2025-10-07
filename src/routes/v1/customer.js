"use strict";

const {
  updateUserProfileV1,
  updateUserDefaultCurrencyV1,
  updateCustomerDeviceTokenV1,
  loginThroughFirebaseV1,
  getFoodicsQrCodesV1,
  acceptTermsAndConditionV1,
  showUserProfileV1,
  getAllCustomerRatingsV1,
  updateUserDefaultLanguageV1,
  deleteCustomerAccountV1,
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

router.route("/profile").put(updateUserProfileV1);

router.route("/default-currency").put(updateUserDefaultCurrencyV1);

router.route('/firebase/is-approved')
    .post(loginThroughFirebaseV1)

router.route('/default-language')
    .put(updateUserDefaultLanguageV1)

router.route('/device-token')
    .put(updateCustomerDeviceTokenV1)

router.route("/accept-terms-and-conditions")
    .post(acceptTermsAndConditionV1);

router.route("/get-profile")
    .get(showUserProfileV1)

router.route("/get-redeem-qrcode")
    .get(getFoodicsQrCodesV1)

router.route("/rating/get-all")
    .get(getAllCustomerRatingsV1)

router.route("/")
    .delete(deleteCustomerAccountV1)

// -----------------------------------Exports----------------------------------------------

module.exports = Router().use("/customer", router);