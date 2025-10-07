"use strict";

const { Merchant, MerchantType, MerchantPromotionTag, Facility, StoreLoyalty, MembershipClaim, CustomerBalance, CustomerTransaction, Currency, Rating, Language, SystemLocalization, CustomerClassification, CuisineType, MerchantTag } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  TRANSACTION_SOURCE_TYPE,
  RATING_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
  COLLECTION,
  TRANSACTION_TYPE,
} = require("@src/constants");
const {
  response,
  formatMerchantCode,
  formatCount,
  insertMessageLog,
} = require("@src/utils");
const haversine = require("haversine");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180),
        latitude: Joi.number().min(-90).max(90),
      }),
    }),
    params: Joi.object().keys({
      merchantId: Joi.string().required(),
    }),
  }),
  async function getMerchantDetailV1Controller(req, res) {
    try {
      const { merchantId } = req.params;
      const { coordinates } = req.body;
      const customerCoordinates = coordinates;

      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      // Find merchant by ID
      const merchant = await Merchant.findOne({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        _id: merchantId,
      });
      if (!merchant) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Merchant not found",
          null,
          res,
          null
        );
      }

      const storeLoyalty = await StoreLoyalty.find({
        merchant_id: merchant.id,
        deleted_at: { $exists: false },
      });

      const currency = await Currency.findOne({
        code: merchant.currency,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      if (!currency) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Currency not found",
          null,
          res,
          null
        );
      }
      const pointRate = currency.point_rate;

      // Calculate the sum and average rating using aggregation
      const sumResult = await Rating.aggregate([
        {
          $match: {
            merchant_id: new Types.ObjectId(merchantId),
            status: RATING_STATUS.APPROVED,
            deleted_at: { $exists: false },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: "$ratings" },
            total_document: { $count: {} },
          },
        },
      ]).then((result) => {
        if (result[0]?.count)
          return {
            rating: (result[0].count / result[0].total_document).toPrecision(2),
            total_count: result[0].total_document,
          };
        else return { rating: 0, total_count: 0 };
      });


      // Check if the store is open or close
      const currentDateTime = new Date();
      const options = {
        weekday: "long",
        timeZone: merchant.timeZone,
        hour12: false,
      };
      const day = currentDateTime.toLocaleDateString("en-US", options);
      delete options.weekday;
      const time = currentDateTime.toLocaleTimeString("en-US", options);

      const operationalHours = merchant.operational_hours[day];

      let isOff =
        operationalHours.isOff ||
        !(
          (time >= operationalHours.opening_time ||
            operationalHours.opening_time == "00:00") &&
          (time <= operationalHours.closing_time ||
            operationalHours.closing_time == "00:00")
        );

      const merchantTypes = await MerchantType.find({
        _id: { $in: merchant?.merchant_type_ids },
        deleted_at: { $exists: false },
      });
      const cuisineTypes = await CuisineType.find({
        _id: { $in: merchant?.cuisine_type_ids },
        deleted_at: { $exists: false },
      });
      const facilities = await Facility.find({
        _id: { $in: merchant?.facilities },
        deleted_at: { $exists: false },
      });
      const merchantTags = await MerchantTag.find({
        _id: { $in: merchant?.merchant_tag_ids },
        deleted_at: { $exists: false },
      });
      let promotions = await MerchantPromotionTag.find({
        merchant_id: merchant.id,
        deleted_at: { $exists: false },
      }).sort({ created_at: "desc" });
      let is_read;
      promotions = promotions.map(async (promotion) => {
        return (promotion = {
          ...promotion._doc,
          id: promotion.id,
        });
      })

      const merchantCoordinates = merchant.location.coordinates;
      const start = {
        latitude: customerCoordinates.latitude,
        longitude: customerCoordinates.longitude,
      };
      const end = {
        latitude: merchantCoordinates[1],
        longitude: merchantCoordinates[0],
      };
      const distance = haversine(start, end, { unit: "km" });

      // Check if customer has balance with this merchant

      let latest_promotion = promotions[0];

      if (latest_promotion)
        latest_promotion = {
          ...latest_promotion,
          formatted_created_at: latest_promotion.created_at.toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            }
          ),
        };

      let deliveryOptionsAvailable = "Open";
      if (isOff) deliveryOptionsAvailable = "Close";


      const merchantDetail = {
        id: merchant.id,
        is_onboarded: merchant.is_onboarded,
        logo: merchant.logo ?? "",
        listing_image: merchant.listing_image ?? "",
        cover_image: merchant.cover_image ?? "",
        store_loyalty: storeLoyalty,
        name: merchant.name,
        cashback_percentage: merchant.cashback_percent,
        latest_promotion: latest_promotion,
        promotions: promotions.map(async (x) => {
          x = {
            id: x.id,
            title: x?.title,
            description: x?.description,
            created_at: x?.created_at,
            image: x?.image,
            formatted_created_at: x?.created_at.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          };
          return x;
        }),
        isOff: isOff,
        minimum_redeem_points: merchant?.minimum_redeem_points ?? 0,
        tag_ids: merchant.merchant_tag_ids,
        unique_code: formatMerchantCode(merchant.unique_code),
        distance: distance.toFixed(0),
        types: merchantTypes.map(x => x.name),
        merchant_tags: merchantTags.map(x => x.name),
        merchant_latitude: merchantCoordinates[1],
        merchant_longitude: merchantCoordinates[0],
        cuisine_types: cuisineTypes.map(x => x.name),
        facilities: facilities.map(x => x.name),
        address: merchant?.address,
        short_description: merchant?.short_description,
        delivery_options: {
          available: deliveryOptionsAvailable,
          deliveryFee: `${merchant.delivery_options.deliveryFee} ${merchant.currency}`,
          deliveryTime: merchant.delivery_options.deliveryTime,
        },
        rating: sumResult.rating,
        rating_count: sumResult.total_count,
        pointRate: pointRate,
      };
      
      const data = {
        merchantDetail
      };

      return response.send(
        1,
        STATUS_CODE.OK,
        "Merchant details",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching public Merchant details: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/web-app/merchant/get-detail/${req?.params?.merchantId}`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch Merchant details",
        null,
        res,
        null
      );
    }
  },
];

// -----------------------------------------EXPORTS---------------------------------------------------------
module.exports = CONTROLLER;


/**
 * @swagger
 * tags:
 *   name: Web-Merchant
 *   description: APIs for merchant operations
 */

/**
 * @swagger
 * /v1/web-app/merchant/get-detail/{merchantId}:
 *   post:
 *     tags: [Web-Merchant]
 *     summary: Get details of a specific merchant
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the merchant to get details
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     minimum: -90
 *                     maximum: 90
 *                   longitude:
 *                     type: number
 *                     minimum: -180
 *                     maximum: 180
 *     responses:
 *       '200':
 *         description: Merchant details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Merchant ID
 *                 listing_image:
 *                   type: string
 *                   description: Merchant image URL
 *                 name:
 *                   type: string
 *                   description: Merchant name
 *                 logo:
 *                   type: string
 *                   description: Merchant logo URL
 *                 cashback_percentage:
 *                   type: number
 *                   description: Cashback percentage offered by the merchant
 *                 user_balance_points:
 *                   type: integer
 *                   description: Customeromeromer's balance points with the merchant
 *                 type:
 *                   type: string
 *                   description: Type of the merchant
 *                   example: default
 *                 user_balance_currency:
 *                   type: string
 *                   description: currency of the merchant
 *                   example: default
 *                 user_balance_value:
 *                   type: string
 *                   description: points converted FIAT amount
 *                   example: default
 *                 tag_ids:
 *                   type: array
 *                   description: Array of tag IDs associated with the merchant
 *                   items:
 *                     type: string
 *                     example: example_tag_id
 *       '404':
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Merchant not found
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Could not process the request
 */
