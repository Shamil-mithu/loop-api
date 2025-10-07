
"use strict";

const { Merchant, MerchantPromotionTag, Category, Facility, MerchantTag, MerchantType, CustomerBalance, Language, CuisineType, SystemLocalization, StoreLoyalty, MembershipClaim, Rating } = require("@src/models");
const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const {
  STATUS_CODE,
  MERCHANT_TYPE,
  RATING_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  validate({
    body: Joi.object().keys({
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180), // Longitude should be between -180 and 180
        latitude: Joi.number().min(-90).max(90), // Latitude should be between -90 and 90
      }),
    }),
  }),
 async function getAllMerchantsV1PublicWebController(req, res) {
  try {
    const { coordinates } = req.body;
    const customerCoordinates = coordinates;

    const merchantsAggregation = await Merchant.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [customerCoordinates.longitude, customerCoordinates.latitude]
          },
          distanceField: 'distance',
          spherical: true
        }
      },
      {
        $addFields: {
          distance: { $divide: ["$distance", 1000] } // meters → km
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
          deliveryRadius: { $ifNull: ["$delivery_options.deliveryRadius", 0] }
        }
      },
      {
        $match: {
          $expr: { $lte: ["$distance", "$deliveryRadius"] }
        }
      },
      // ✅ Lookup merchant types
      {
        $lookup: {
          from: "merchant_type",
          localField: "merchant_type_ids",
          foreignField: "_id",
          pipeline: [
            { $match: { deleted_at: { $exists: false } } },
            { $project: { name: 1 } }
          ],
          as: "types"
        }
      },
      // ✅ Lookup ratings and calculate average + count
      {
        $lookup: {
          from: "rating",
          let: { merchantId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$merchant_id", "$$merchantId"] },
                status: RATING_STATUS.APPROVED,
                deleted_at: { $exists: false }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$ratings" },
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                rating: {
                  $cond: [
                    { $eq: ["$count", 0] },
                    0,
                    { $round: [{ $divide: ["$total", "$count"] }, 2] }
                  ]
                },
                rating_count: "$count"
              }
            }
          ],
          as: "ratings"
        }
      },
      {
        $unwind: {
          path: "$ratings",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { distance: 1 } },
            {
              $project: {
                id: "$_id",
                listing_image: { $ifNull: ["$listing_image", ""] },
                name: 1,
                logo: { $ifNull: ["$logo", ""] },
                types: "$types.name",
                cashback_percentage: "$cashback_percent",
                distance: {
                  $cond: [
                    { $lt: ["$distance", 1] },
                    { $concat: [{ $toString: { $round: [{ $multiply: ["$distance", 1000] }, 0] } }, " m"] },
                    { $concat: [{ $toString: { $round: ["$distance", 0] } }, " km"] }
                  ]
                },
                distance_for_sorting: "$distance",
                rating: { $ifNull: ["$ratings.rating", 0] },
                rating_count: { $ifNull: ["$ratings.rating_count", 0] },
                delivery_time: "$delivery_options.deliveryTime",
                latitude: { $arrayElemAt: ["$location.coordinates", 1] },
                longitude: { $arrayElemAt: ["$location.coordinates", 0] }
              }
            }
          ]
        }
      }
    ]);

    const merchants = merchantsAggregation[0].data;
    const totalMerchantDocuments = merchantsAggregation[0].metadata[0]?.total || 0;

    const data = {
      total_document: totalMerchantDocuments,
      merchants
    };

    return response.send(1, STATUS_CODE.OK, 'merchants list', data, res, null);
  } catch (error) {
    console.log(error.message ?? error);
    insertMessageLog(
      LOG_TYPE.ERROR,
      `Exception while fetching merchants list  : ${error?.message}`,
      {
        message: error?.message,
        stack: error?.stack,
        errorObject: error,
      },
      "/v1/web-app/merchant/get-name",
      HTTP_VERBS.GET,
      null
    );
    return response.send(
      0,
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "Couldn't fetch merchants list ",
      null,
      res,
      error
    );
  }
}

];

// -----------------------------------------EXPORTS---------------------------------------------------------
module.exports = CONTROLLER;
/**
 * @swagger
 * tags:
 *   name: Web-Merchant
 *   description: Merchant management operations
 */

/**
 * @swagger
 * /v1/web-app/merchant/get-name:
 *   post:
 *     summary: Retrieve all merchants' names
 *     tags: [Web-Merchant]
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
 *     responses:
 *       200:
 *         description: A list of merchants based on the specified filters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of merchants available
 *                   example: 100
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: Number of merchants returned per page
 *                   example: 10
 *                 merchants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Unique identifier of the merchant
 *                         example: "605c72f5e4b0c8d07b742af9"
 *                       listing_image:
 *                         type: string
 *                         description: URL to the merchant's listing image
 *                         example: "http://example.com/image.jpg"
 *                       name:
 *                         type: string
 *                         description: Name of the merchant
 *                         example: "Merchant Name"
 *                       logo:
 *                         type: string
 *                         description: URL to the merchant's logo
 *                         example: "http://example.com/logo.jpg"
 *                       cashback_percentage:
 *                         type: number
 *                         format: float
 *                         description: Cashback percentage offered by the merchant
 *                         example: 5.0
 *                       user_balance_points:
 *                         type: integer
 *                         description: User's balance points for the merchant
 *                         example: 100
 *                       user_balance_formatted_points:
 *                         type: string
 *                         description: Formatted representation of user balance points
 *                         example: "100 points"
 *                       tag_ids:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: List of tag IDs associated with the merchant
 *                         example: ["605c72f5e4b0c8d07b742af9", "605c72f5e4b0c8d07b742af8"]
 *                       distance:
 *                         type: string
 *                         description: Distance from the user's location to the merchant
 *                         example: "2 km"
 *                       distance_for_sorting:
 *                         type: number
 *                         format: float
 *                         description: Numerical distance for sorting purposes
 *                         example: 2.5
 *                       store_loyalties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                       rating:
 *                         type: number
 *                         format: float
 *                         description: Average rating of the merchant
 *                         example: 4.5
 *                       rating_count:
 *                         type: integer
 *                         description: Total number of ratings for the merchant
 *                         example: 20
 *                       promotions:
 *                         type: object
 *                         description: Latest promotion information for the merchant
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "605c72f5e4b0c8d07b742af9"
 *                           title:
 *                             type: string
 *                             example: "20% off on your first order"
 *                       delivery_time:
 *                         type: string
 *                         description: Estimated delivery time for the merchant
 *                         example: "30-40 minutes"
 *                       is_membership_claimed:
 *                         type: boolean
 *                         description: Indicates if the user has claimed membership for the merchant
 *                         example: true
 *                       latitude:
 *                         type: number
 *                         format: float
 *                         description: Latitude of the merchant's location
 *                         example: 40.730610
 *                       longitude:
 *                         type: number
 *                         format: float
 *                         description: Longitude of the merchant's location
 *                         example: -73.935242
 *       400:
 *         description: Bad request if the input validation fails
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid request body"
 *       401:
 *         description: Unauthorized if authentication fails
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized access"
 *       404:
 *         description: Not found if no merchants are available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No merchants found"
 */
