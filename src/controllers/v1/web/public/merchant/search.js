"use strict";

const {
  Merchant,
  SystemLocalization,
  Language,
  Store,
} = require("@src/models");
const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
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
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  validate({
    body: Joi.object().keys({
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180),
        latitude: Joi.number().min(-90).max(90),
      }),
    }),
    query: Joi.object().keys({
      query: Joi.string().optional().allow("").default(""),
    }),
  }),
  async function searchMerchantsPublicWebV1Controller(req, res) {
    try {
      const { query } = req.query;
      const { coordinates } = req.body;
      const customerCoordinates = coordinates;
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
        merchantFilter.push({
          $match: { name: { $regex: new RegExp(query, "i") } }
        });
      }


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
          matchedMerchant.name = merchant.name;
          matchedMerchant.banner = merchant.listing_image ?? "";
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
      console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching search result : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/web-app/merchant/search?query={query}",
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
 *   name: Web-Merchant
 *   description: APIs for merchant operations
 */

/**
 * @swagger
 * /v1/web-app/merchant/search?query={query}:
 *   post:
 *     tags: [Web-Merchant]
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
