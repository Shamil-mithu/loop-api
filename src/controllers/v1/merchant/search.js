"use strict";

const {
  Merchant,
  CustomerBalance,
  SystemLocalization,
  Language,
  Store,
} = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  LOG_TYPE,
  HTTP_VERBS,
  MERCHANT_TYPE,
} = require("@src/constants");
const {
  response,
  insertMessageLog,
  getStoreRatesAndAppCashback,
} = require("@src/utils");
const haversine = require("haversine");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180),
        latitude: Joi.number().min(-90).max(90),
      }),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
    query: Joi.object().keys({
      query: Joi.string().optional().allow("").default(""),
    }),
  }),
  async function searchMerchantsV1Controller(req, res) {
    try {
      const { query } = req.query;
      const { coordinates } = req.body;
      // let { limit, page } = req.body;
      const customerCoordinates = coordinates;
      const { customer } = req;
      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      let storeFilter = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        ...(query ? { name: { $regex: new RegExp(query, "i") } } : {}),
      };
      let merchantFilter = [
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [customerCoordinates.longitude, customerCoordinates.latitude] // [lng, lat]
            },
            distanceField: 'distance',
            spherical: true
          }
        },
        {
          $addFields: {
            distance: { $divide: ["$distance", 1000] } // Convert meters to kilometers
          }
        },
        {
          $match: {
            type: MERCHANT_TYPE.DEFAULT,
            $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
            is_published: true,
          }
        },
        {
          $addFields: {
            deliveryRadius: { $ifNull: ["$delivery_options.deliveryRadius", 0] } // Default to 0 if not set
          }
        },
        {
          $match: {
            $expr: { $lte: ["$distance", "$deliveryRadius"] } // Ensure merchant is within delivery radius
          }
        },
        { $sort: { is_onboarded: -1, distance: 1 } } // Sort by nearest merchants
      ];

      if (query) {
        if (
          customer?.default_language?.toString() ===
          defaultSystemLang?._id.toString()
        ) {
          merchantFilter.push({
            $match: { name: { $regex: new RegExp(query, "i") } }
          });
        } else {
          const localizedNames = await SystemLocalization.find({
            key: { $regex: new RegExp("_merchant_name", "i") },
            value: { $regex: new RegExp(query, "i") },
            lang_id: customer.default_language,
          });
          const merchantIds = localizedNames.map(
            (local) => new Types.ObjectId(local.key.split("_")[0])
          );
          merchantFilter.push({
            $match: { _id: { $in: merchantIds } }
          });
        }
      }

      const customerBalances = await CustomerBalance.find({
        customerId: customer.id,
      });
      const customerBalancesBrandIds = customerBalances.map((balance) =>
        balance.reference_id.toString()
      );
      const merchants = await Merchant.aggregate(merchantFilter)
      let stores = await Store.find(storeFilter).select(
        "_id name logo banner actions_detail currency"
      );
      stores = stores.map((store) => {
        const { _id, name, logo, banner, actions_detail, currency } =
          store._doc;
        const { app_cashback, rates } = getStoreRatesAndAppCashback(
          actions_detail,
          currency
        );
        return {
          id: _id,
          name,
          logo,
          banner,
          app_cashback,
        };
      });

      const matchedMerchants = await Promise.all(
        merchants.map(async (merchant) => {
          let matchedMerchant = {
            id: merchant._id,
            banner: merchant.listing_image ?? "",
            name: merchant.name,
            logo: merchant.logo ?? "",
            distance: merchant.distance //.fixed(2),
          };
          if (customer.default_language != req.default_language) {
            const localizedName = await SystemLocalization.findOne({
              key: `${merchant.id}_merchant_name`,
              lang_id: customer.default_language,
            });
            matchedMerchant.name = localizedName?.value ?? merchant.name;

            const localizedListingImage = await SystemLocalization.findOne({
              key: `${merchant.id}_merchant_listingImage`,
              lang_id: customer.default_language,
            });
            matchedMerchant.banner =
              localizedListingImage?.value ?? merchant.listing_image ?? "";
          }
          return matchedMerchant;
        })
      );

      const data = {
        merchants: matchedMerchants,
        stores,
      };

      return response.send(
        1,
        STATUS_CODE.OK,
        "merchants list",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching search result : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/merchant/search?query={query}",
        HTTP_VERBS.POST,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch search result",
        null,
        res,
        error
      );
    }
  },
];

// -----------------------------------------EXPORTS---------------------------------------------------------
module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Merchant
 *   description: APIs for merchant operations
 */

/**
 * @swagger
 * /v1/merchant/search?query={query}:
 *   post:
 *     tags: [Merchant]
 *     summary: Search merchants by name
 *     parameters:
 *       - in: path
 *         name: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Search merchants by name
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
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 default: 10
 *     responses:
 *       '200':
 *         description: Matched merchants by name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total_document:
 *                       type: integer
 *                 merchants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Merchant ID
 *                       listing_image:
 *                         type: string
 *                         description: Merchant image URL
 *                       name:
 *                         type: string
 *                         description: Merchant name
 *                       logo:
 *                         type: string
 *                         description: Merchant logo URL
 *                       cashback_percentage:
 *                         type: number
 *                         description: Cashback_percentage offered by the merchant
 *                       user_balance_points:
 *                         type: integer
 *                         description: Customer's balance points with the merchant
 *                       distance:
 *                         type: number
 *                         description: Distance from the customer to the merchant in kilometers
 *                         example: 1.2
 *                       type:
 *                         type: string
 *                         description: Internal or default
 *                         example: default
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
