"use strict";

const {
  getAllMerchantsPublicWebV1,
  getAllTagsPublicWebV1,
  getMerchantDetailPublicWebV1,
  getMerchantVibesPublicWebV1,
  searchMerchantsPublicWebV1,
  getMostLovedMerchantPublicWebV1,
  getAllMerchantsNamePublicWebV1,

  getAllMerchantsV1,
  getAllTagsV1,
  getMerchantDetailV1,
  getMerchantVibesV1,
  getAllMerchantVibesV1,
  searchMerchantsV1,
  getRedemptionCodeV1,
  getMostLovedMerchantV1,
  claimStoreMembership,
  showAMerchantVibeV1,
  markSeenPromotionV1Controller,
  likeAMerchantVibeV1,
  markSeenVibeV1Controller,
  getAllVibesByPopularityV1Controller,
  getAllMerchantsNamesV1Controller,
  checkInRedeemToAMerchantV1Controller,
  checkInToAMerchantV1Controller,
  redeemLaterToAMerchantV1Controller,
  postAllVibesByPopularityV1Controller
} = require("@src/controllers");
const { Router } = require("express");
const { chooseController } = require("@src/utils");

const router = Router();

//------------------------------------Merchant-------------------------------

router.route("/get-all").post(chooseController(getAllMerchantsV1, getAllMerchantsPublicWebV1));
router.route("/get-name").post(chooseController(getAllMerchantsNamesV1Controller, getAllMerchantsNamePublicWebV1));
router.route("/loved/most").post(chooseController(getMostLovedMerchantV1, getMostLovedMerchantPublicWebV1));
router.route("/get-detail/:merchantId").post(chooseController(getMerchantDetailV1, getMerchantDetailPublicWebV1));
router.route("/search").post(chooseController(searchMerchantsV1, searchMerchantsPublicWebV1));

router.route("/check-in/:merchantId").get(checkInToAMerchantV1Controller);
router.route("/check-in/redeem-later/:merchantId").put(redeemLaterToAMerchantV1Controller);
router.route("/check-in/redeem").post(checkInRedeemToAMerchantV1Controller);

//------------------------------------Merchant-Tag-------------------------------

router.route("/tag/get-all").get(chooseController(getAllTagsV1, getAllTagsPublicWebV1));

//------------------------------------Merchant-Vibe-------------------------------

router.route("/vibe/get-all/:merchantId").get(chooseController(getMerchantVibesV1, getMerchantVibesPublicWebV1));
router.route("/vibe/get-all").get(getAllMerchantVibesV1);
router.route("/vibe/popular/get-all").get(getAllVibesByPopularityV1Controller);
router.route("/vibe/popular/get-all").post(postAllVibesByPopularityV1Controller);
router.route("/vibe/:merchantVibeId").get(showAMerchantVibeV1);
router.route("/vibe/:merchantVibeId").put(likeAMerchantVibeV1);
router.route("/vibe/seen/:merchantVibeId").put(markSeenVibeV1Controller);

//------------------------------------Membership-claim---------------------------------
router.route("/claim-membership").post(claimStoreMembership);
router.route("/get-redemption-code").post(getRedemptionCodeV1);

//-----------------------------------Merchant-Promotion--------------------------------

router
  .route("/promotion/read/:merchantPromotionTagId")
  .put(markSeenPromotionV1Controller);

//--- ---------------------------------Exports-----------------------------------------

module.exports = Router().use("/merchant", router);
