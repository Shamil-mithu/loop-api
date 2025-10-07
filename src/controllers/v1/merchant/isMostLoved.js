"use strict";

const { Merchant, Rating, Language, SystemLocalization, StoreLoyalty } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const {
  STATUS_CODE,
  RATING_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
  MERCHANT_TYPE
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const { Types } = require("mongoose");
const bodyParser = require("body-parser");

// -----------------------------------------CONTROLLER---------------------------------------------------------
const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180), // Longitude should be between -180 and 180
        latitude: Joi.number().min(-90).max(90), // Latitude should be between -90 and 90
      }).required(),
    }).required(),
  }),
  async function getMostLovedMerchantsV1Controller(req, res) {
    try {
      const { customer } = req;
      const { coordinates } = req.body;
      const customerCoordinates = coordinates;

      const merchants = await Merchant.aggregate([
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
            is_most_loved: true,
            type: MERCHANT_TYPE.DEFAULT,
            $or: [
              { deleted_at: { $exists: false } },
              { deleted_at: null }
            ],
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
        {
          $project: {
            name: 1,
            logo: 1,
            cover_image: 1,
            delivery_time: 1,
            delivery_options: 1,
            currency: 1,
            city_id: { $toObjectId: "$city_id" },
            country_id: { $toObjectId: "$country_id" },
            state_id: { $toObjectId: "$state_id" },
            area_id: { $toObjectId: "$area_id" },
            category_id: { $toObjectId: "$category_id" }
          }
        },
        {
          $lookup: {
            from: "cities", // Assuming the collection name for cities
            localField: "city_id",
            foreignField: "_id",
            as: "city"
          }
        },
        {
          $lookup: {
            from: "countries", // Assuming the collection name for countries
            localField: "country_id",
            foreignField: "_id",
            as: "country"
          }
        },
        {
          $lookup: {
            from: "states", // Assuming the collection name for states
            localField: "state_id",
            foreignField: "_id",
            as: "state"
          }
        },
        {
          $lookup: {
            from: "areas", // Assuming the collection name for areas
            localField: "area_id",
            foreignField: "_id",
            as: "area"
          }
        },
        {
          $lookup: {
            from: "categories", // Assuming the collection name for categories
            localField: "category_id",
            foreignField: "_id",
            as: "category"
          }
        },
        {
          $unwind: { path: "$city", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$country", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$state", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$area", preserveNullAndEmptyArrays: true }
        },
        {
          $unwind: { path: "$category", preserveNullAndEmptyArrays: true }
        },
        {
          $project: {
            name: 1,
            logo: 1,
            cover_image: 1,
            delivery_time: 1,
            delivery_options: 1,
            currency: 1,
            city: { name: "$city.name", country_code: "$city.country_code", state_code: "$city.state_code" },
            country: { name: "$country.name", code: "$country.code" },
            state: { name: "$state.name", code: "$state.code" },
            area: { name: "$area.name" },
            category: { name: "$category.name" }
          }
        }
      ]);

      const defaultSystemLang = await Language.findOne({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        code: "en",
      });
      const isDefaultLang =
        customer?.default_language.toString() ==
        defaultSystemLang._id.toString();

      const mostLovedMerchants = await Promise.all(
        merchants.map(async (merchant) => {
          const sumResult = await Rating.aggregate([
            {
              $match: {
                merchant_id: new Types.ObjectId(merchant._id),
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
                rating: (
                  result[0].count / result[0].total_document
                ).toPrecision(2),
                total_count: result[0].total_document,
              };
            else return { rating: 0, total_count: 0 };
          });

          let name = merchant.name;
          if (!isDefaultLang) {
            const defaultLang = await Language.findById(
              customer.default_language
            );
            const localizedName = await SystemLocalization.findOne({
              key: `${merchant.id}_merchant_name`,
              lang_id: defaultLang.id,
            });
            name = localizedName?.value ?? merchant.name;
          }
          const storeLoyalties = await StoreLoyalty.find({
            merchant_id: merchant.id,
            $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
          });

          const localizedLoyalities = await Promise.all(
            storeLoyalties.map(async (entity) => {
              const sysName = await SystemLocalization.findOne({
                eid: entity.id.toString(),
                key: `${entity._id}_storeLoyalty_name`,
                lang_id: customer.default_language,
              });
              const sysTitle = await SystemLocalization.findOne({
                eid: entity._id.toString(),
                key: `${entity._id}_storeLoyalty_title`,
                lang_id: customer.default_language,
              });
              const sysSubTitle = await SystemLocalization.findOne({
                eid: entity._id.toString(),
                key: `${entity._id}_storeLoyalty_sub_title`,
                lang_id: customer.default_language,
              });
              const sysDescription = await SystemLocalization.findOne({
                eid: entity._id.toString(),
                key: `${entity._id}_storeLoyalty_description`,
                lang_id: customer.default_language,
              });
              const sysBgImage = await SystemLocalization.findOne({
                eid: entity._id.toString(),
                key: `${entity._id}_storeLoyalty_background_image`,
                lang_id: customer.default_language,
              });

              if (
                sysName ||
                sysTitle ||
                sysSubTitle ||
                sysDescription ||
                sysBgImage
              ) {
                entity.name = sysName?.value ?? entity.name;
                entity.title = sysTitle?.value ?? entity.title;
                entity.sub_title = sysSubTitle?.value ?? entity.sub_title;
                entity.description =
                  sysDescription?.value ?? entity.description;
                entity.background_image =
                  sysBgImage?.value ?? entity.background_image;
                return entity;
              }
              return entity;
            })
          );

          return {
            id: merchant._id,
            name: name,
            logo: merchant.logo,
            cover_image: merchant?.cover_image ?? "",
            delivery_time: merchant?.delivery_time ?? "",
            delivery_fee: merchant?.delivery_options?.deliveryFee ?? null,
            delivery_radius : merchant?.delivery_options?.deliveryRadius ?? null,
            currency: merchant?.currency,
            rating: sumResult.rating,
            store_loyalties: localizedLoyalities,
          };
        })
      );

      const data = { merchants: mostLovedMerchants };
      return response.send(
        1,
        STATUS_CODE.OK,
        "merchants list",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching most loved merchants list : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/merchant/loved/most",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch most loved merchants list",
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
 * /v1/merchant/loved/most:
 *   post:
 *     tags: [Merchant]
 *     summary: Get Most Loved Merchants 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     description: Longitude of the customer's location
 *                     example: 67.0615623
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     description: Latitude of the customer's location
 *                     example: 24.931856 
 *     responses:
 *       '200':
 *         description: List of Most Loved Merchants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_documents:
 *                   type: integer
 *                   description: Total number of merchant documents
 *                   example: 50
 *                 merchants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Merchant ID
 *                         example: "60af9245d3c41e2a4c8d4af8"
 *                       name:
 *                         type: string
 *                         description: Merchant name
 *                         example: "Mithu"
 *                       delivery_time:
 *                         type: integer
 *                         description: Delivery time in minutes
 *                         example: 30
 *                       currency:
 *                         type: string
 *                         description: Currency code
 *                         example: "SAR"
 *                       logo:
 *                         type: string
 *                         description: URL of the merchant's logo
 *                         example: "https://example.com/logo.png"
 *                       cover_image:
 *                         type: string
 *                         description: URL of the merchant's cover image
 *                         example: "https://example.com/cover.png"
 *                       delivery_options:
 *                         type: object
 *                         properties:
 *                           deliveryFee:
 *                             type: number
 *                             description: Delivery fee
 *                             example: 5
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
