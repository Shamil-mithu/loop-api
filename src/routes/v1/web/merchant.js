"use strict";

const {
  getAllMerchantsPublicWebV1,
  getAllTagsPublicWebV1,
  getMerchantDetailPublicWebV1,
  getMerchantVibesPublicWebV1,
  // getAllMerchantVibesV1,
  searchMerchantsPublicWebV1,
  // getRedemptionCodeV1,
  getMostLovedMerchantPublicWebV1,
  // showAMerchantVibeV1,
  // markSeenPromotionV1Controller,
  // likeAMerchantVibeV1,
  // markSeenVibeV1Controller,
  // getAllVibesByPopularityV1Controller,
  getAllMerchantsNamePublicWebV1,
  // checkInRedeemToAMerchantV1Controller,
  // checkInToAMerchantV1Controller,
  // redeemLaterToAMerchantV1Controller,
  // postAllVibesByPopularityV1Controller
} = require("@src/controllers");
const { Router } = require("express");

const router = Router();

//------------------------------------Merchant-------------------------------
router.route("/get-all").post(getAllMerchantsPublicWebV1);
router.route("/get-name").post(getAllMerchantsNamePublicWebV1);

router.route("/loved/most").post(getMostLovedMerchantPublicWebV1);

router.route("/get-detail/:merchantId").post(getMerchantDetailPublicWebV1);

router.route("/search").post(searchMerchantsPublicWebV1);
// router.route("/check-in/:merchantId").get(checkInToAMerchantV1Controller);
// router.route("/check-in/redeem-later/:merchantId").put(redeemLaterToAMerchantV1Controller);
// router.route("/check-in/redeem").post(checkInRedeemToAMerchantV1Controller);

//------------------------------------Merchant-Tag-------------------------------

router.route("/tag/get-all").get(getAllTagsPublicWebV1);

//------------------------------------Merchant-Vibe-------------------------------

router.route("/vibe/get-all/:merchantId").get(getMerchantVibesPublicWebV1);

// router.route("/vibe/get-all").get(getAllMerchantVibesV1);

// router.route("/vibe/popular/get-all").get(getAllVibesByPopularityV1Controller);
// router.route("/vibe/popular/get-all").post(postAllVibesByPopularityV1Controller);

// router.route("/vibe/:merchantVibeId").get(showAMerchantVibeV1);

// router.route("/vibe/:merchantVibeId").put(likeAMerchantVibeV1);

// router.route("/vibe/seen/:merchantVibeId").put(markSeenVibeV1Controller);

//------------------------------------Membership-claim---------------------------------

// router.route("/get-redemption-code").post(getRedemptionCodeV1);

//-----------------------------------Merchant-Promotion--------------------------------

// router
//   .route("/promotion/read/:merchantPromotionTagId")
// .put(markSeenPromotionV1Controller);

//--- ---------------------------------Exports-----------------------------------------

module.exports = Router().use("/merchant", router);
