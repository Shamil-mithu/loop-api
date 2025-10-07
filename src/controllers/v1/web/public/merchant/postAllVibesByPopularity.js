"use strict";

const { MerchantVibe, Merchant, Language, SystemLocalization } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  LOG_TYPE,
  HTTP_VERBS,
  RATING_STATUS,
  MERCHANT_TYPE
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180).allow(null), // Longitude should be between -180 and 180
        latitude: Joi.number().min(-90).max(90).allow(null), // Latitude should be between -90 and 90
      }).optional(),
    }),
  }),
  async function getAllVibesByPopularity(req, res) {
    try {
      const { customer } = req;
      let { page, limit, coordinates } = req.body;
      page = page - 1;
      let merchantsAggregation = [], merchantIds = []
      const vibesQuery = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };

      if (coordinates?.latitude && coordinates?.longitude) {
        const { latitude, longitude } = coordinates;
        merchantsAggregation = await Merchant.aggregate([
          {
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [longitude, latitude] // [lng, lat]
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
              $or: [
                { deleted_at: { $exists: false } },
                { deleted_at: null }
              ],
              is_published: true
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
            $facet: {
              metadata: [{ $count: "total" }], // Count total filtered documents
              data: [
                { $sort: { distance: 1 } }, // Sort by nearest merchants
                // { $skip: page * limit },
                // { $limit: limit }
              ]
            }
          }
        ]);
        merchantIds = merchantsAggregation[0]?.data?.map(merchant => merchant._id)
        vibesQuery["merchant_id"] = { $in: merchantIds }
      }

      // Find default language
      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });


      const totalVibes = await MerchantVibe.countDocuments(vibesQuery);

      // Fetch vibes sorted by popularity
      const vibes = await MerchantVibe.aggregate([
        {
          $match: vibesQuery, // Apply initial query to filter vibes
        },
        {
          $addFields: {
            seenCount: {
              $floor: {
                $add: [
                  5000,
                  { $multiply: [5000, { $rand: {} }] }
                ]
              }
            },
            is_liked: { $in: [customer._id, "$liked_by"] },
            likes: {
              $floor: {
                $add: [
                  1000,
                  { $multiply: [700, { $rand: {} }] } // 1000–1699
                ]
              }
            },
          }
        },        
        {
          $lookup: {
            from: "merchant",
            localField: "merchant_id",
            foreignField: "_id",
            as: "merchant",
            pipeline: [
              {
                $project: {
                  name: 1,
                  logo: 1,
                  currency: 1,
                  address: 1,
                  area_id: 1,
                  merchant_type_ids: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
              {
                $lookup: {
                  from: "area",
                  localField: "area_id",
                  foreignField: "_id",
                  as: "area",
                  pipeline: [
                    {
                      $project: {
                        name: 1,
                        _id: 0,
                        id: "$_id",
                      },
                    },
                  ],
                },
              },
              { $unwind: { path: "$area" } },
              {
                $lookup: {
                  from: "merchant_type",
                  localField: "merchant_type_ids",
                  foreignField: "_id",
                  as: "merchant_types",
                  pipeline: [
                    {
                      $project: {
                        name: 1,
                        _id: 0,
                        id: "$_id",
                      },
                    },
                  ],
                },
              },
              {
                $project: {
                  merchant_type_ids: 0,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "rating",
            localField: "merchant_id",
            foreignField: "merchant_id",
            as: "ratings",
            pipeline: [
              {
                $match: {
                  $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
                  status: RATING_STATUS.APPROVED,
                },
              },
              {
                $project: {
                  ratings: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },
        { $unwind: { path: "$merchant", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: "$ratings" }, 0] },
                then: { $avg: "$ratings.ratings" },
                else: null,
              },
            },
          },
        },
        {
          $sample: { size: 100 }, // Randomly sample up to 100 documents (adjust size as needed)
        },
        { $skip: page * limit },
        { $limit: limit },
        {
          $project: {
            merchant_id: 0,
            ratings: 0,
            "merchant.merchant_types._id": 0,
          },
        },
      ]);


      const meta = {
        total_document: totalVibes,
        page: page + 1,
        limit,
        page_count: Math.ceil(totalVibes / limit),
      };

      let data = {
        vibes,
        meta,
      };

      // Handle localization
      if (
        customer?.default_language?.toString() ===
        defaultSystemLang?._id.toString()
      ) {
        return response.send(1, STATUS_CODE.OK, "vibes", data, res, null);
      }

      const localizedVibes = await Promise.all(
        vibes.map(async (vibe) => {
          const localizedImage = await SystemLocalization.findOne({
            eid: vibe._id.toString(),
            key: `${vibe._id}_merchantVive_image`,
            lang_id: customer?.default_language,
          });

          const merchantLocalName = await SystemLocalization.findOne({
            eid: vibe.merchant.id.toString(),
            key: `${vibe.merchant.id}_merchant_name`,
            lang_id: customer?.default_language,
          });

          const merchantLocalAddress = await SystemLocalization.findOne({
            eid: vibe.merchant.id.toString(),
            key: `${vibe.merchant.id}_merchant_address`,
            lang_id: customer?.default_language,
          });

          const merchant_types_local = await Promise.all(
            vibe.merchant.merchant_types.map(async (type) => {
              const merchantLocalAddress = await SystemLocalization.findOne({
                eid: type.id.toString(),
                key: `${type.id}_merchantType_name`,
                lang_id: customer?.default_language,
              });

              return {
                id: type.id,
                name: merchantLocalAddress?.value ?? type.name,
              };
            })
          );

          return {
            ...vibe,
            merchant: {
              ...vibe.merchant,
              name: merchantLocalName?.value ?? vibe.merchant.name,
              address: merchantLocalAddress?.value ?? vibe.merchant.address,
              merchant_types: merchant_types_local,
            },
            image: localizedImage?.value ?? vibe.image,
            formatted_createdAt_day: vibe?.created_at.toLocaleDateString(
              "ar-SA",
              {
                weekday: "long",
              }
            ),
            formatted_createdAt_month: vibe?.created_at.toLocaleDateString(
              "ar-SA",
              {
                month: "short",
                day: "numeric",
              }
            ),
          };
        })
      );

      data = {
        vibes: localizedVibes,
        meta,
      };

      return response.send(1, STATUS_CODE.OK, "vibes", data, res, null);
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching vibes by popularity: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/merchant/vibe/popular/get-all`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch vibes",
        null,
        res,
        error
      );
    }
  },
];

module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Merchant
 *   description: APIs for merchant operations
 */

/**
 * @swagger
 * /v1/merchant/vibe/popular/get-all:
 *   post:
 *     tags: [Merchant]
 *     summary: Get all vibes sorted by popularity
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
 *                     description: Longitude for calculating distance from merchants
 *                     example: 12.4924
 *                   latitude:
 *                     type: number
 *                     description: Latitude for calculating distance from merchants
 *                     example: 41.8902
 *               page:
 *                 type: integer
 *                 description: The page number for pagination
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 description: The number of records per page
 *                 example: 10
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of merchant vibes.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vibes retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     vibes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "671634bfe608bf68492d724a"
 *                           swipe_text:
 *                             type: string
 *                             example: "title"
 *                           created_by:
 *                             type: string
 *                             example: "6707a86ff2f243aa23ebfb55"
 *                           seen_by:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["670e6fc09e5d87addb1577dd", "6662ed30c29d5a21cf8abb51", "671649963c0464918b7fc061"]
 *                           seenCount:
 *                             type: integer
 *                             example: 3
 *                           liked_by:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: []
 *                           likes:
 *                             type: integer
 *                             example: 0
 *                           image:
 *                             type: string
 *                             example: "https://dev-mithu.s3.me-central-1.amazonaws.com/dev-mithu/merchant-vibes/1729508543189.png"
 *                           thumbnail:
 *                             type: string
 *                             example: "https://dev-mithu.s3.me-central-1.amazonaws.com/dev-mithu/merchant-vibes/1729508543189.jpeg"
 *                           isVideo:
 *                             type: boolean
 *                             example: false
 *                           merchant:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                   example: "Merchant Name"
 *                                 logo:
 *                                   type: string
 *                                   example: "https://example.com/logo.png"
 *                                 id:
 *                                   type: string
 *                                   example: "6707aa7ff2f243aa23ebfeac"
 *                           expiry:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-10-25T10:17:00.000Z"
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-10-21T11:02:23.330Z"
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-10-23T11:49:06.175Z"
 *                     meta:
 *                       type: object
 *                       properties:
 *                         total_document:
 *                           type: integer
 *                           example: 25
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         page_count:
 *                           type: integer
 *                           example: 3
 *       '500':
 *         description: Internal server error.
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
 *                   example: Could not fetch merchant vibes
 */
