
"use strict";

const { Merchant, MerchantPromotionTag, MerchantType, CustomerBalance, Language, SystemLocalization, StoreLoyalty, MembershipClaim, Rating } = require("@src/models");
const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
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
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      tag_id: Joi.string().allow(""),
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180), // Longitude should be between -180 and 180
        latitude: Joi.number().min(-90).max(90), // Latitude should be between -90 and 90
      }),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
  }),
  async function getAllMerchantsV1Controller(req, res) {
    try {
      console.log('inside public merchant get all');
      const { tag_id, coordinates } = req.body;
      const { limit, page } = req.body; // page starts at 0
      const customerCoordinates = coordinates;

      const filter = {
        type: MERCHANT_TYPE.DEFAULT,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        is_published: true,
      };

      if (tag_id?.length > 0) {
        filter.merchant_tag_ids = { $in: Array.isArray(new Types.ObjectId(tag_id)) ? tag_id : [new Types.ObjectId(tag_id)] };
      }

      const merchantsAggregation = await Merchant.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [customerCoordinates.longitude, customerCoordinates.latitude],
            },
            distanceField: "distance",
            spherical: true,
          },
        },

        { $addFields: { distance: { $divide: ["$distance", 1000] } } },

        { $match: filter },

        { $addFields: { deliveryRadius: { $ifNull: ["$delivery_options.deliveryRadius", 0] } } },

        { $match: { $expr: { $lte: ["$distance", "$deliveryRadius"] } } },

        {
          $lookup: {
            from: "merchant_type",
            localField: "merchant_type_ids",
            foreignField: "_id",
            pipeline: [{ $match: { deleted_at: { $exists: false } } }],
            as: "merchantTypes",
          },
        },
        {
          $lookup: {
            from: "merchant_tags",
            localField: "merchant_tag_ids",
            foreignField: "_id",
            pipeline: [{ $match: { deleted_at: { $exists: false } } }],
            as: "merchantTags",
          },
        },

        {
          $lookup: {
            from: "rating",
            let: { merchantId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$merchant_id", "$$merchantId"] },
                  status: RATING_STATUS.APPROVED,
                  deleted_at: { $exists: false },
                },
              },
              {
                $group: {
                  _id: null,
                  totalRatings: { $sum: "$ratings" },
                  totalCount: { $sum: 1 },
                },
              },
            ],
            as: "ratingsData",
          },
        },
        {
          $addFields: {
            rating: {
              $cond: [
                { $gt: [{ $size: "$ratingsData" }, 0] },
                {
                  $round: [
                    {
                      $divide: [
                        { $arrayElemAt: ["$ratingsData.totalRatings", 0] },
                        { $arrayElemAt: ["$ratingsData.totalCount", 0] },
                      ],
                    },
                    1,
                  ],
                },
                0,
              ],
            },
            rating_count: { $ifNull: [{ $arrayElemAt: ["$ratingsData.totalCount", 0] }, 0] },
          },
        },

        {
          $lookup: {
            from: "merchant_promotion_tag",
            let: { merchantId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$merchant_id", "$$merchantId"] },
                  deleted_at: { $exists: false },
                },
              },
              { $sort: { created_at: -1 } },
              { $limit: 1 },
            ],
            as: "promotions",
          },
        },

        {
          $lookup: {
            from: "store_loyalty",
            let: { merchantId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$merchant_id", "$$merchantId"] },
                  deleted_at: { $exists: false },
                },
              },
            ],
            as: "store_loyalties",
          },
        },

        {
          $project: {
            id: "$_id",
            is_onboarded: 1,
            is_most_loved: 1,
            listing_image: { $ifNull: ["$listing_image", ""] },
            name: 1,
            logo: { $ifNull: ["$logo", ""] },
            types: "$merchantTypes.name",
            cashback_percentage: "$cashback_percent",
            tag_ids: "$merchant_tag_ids",
            tags: "$merchantTags.name",
            distance: {
              $cond: [
                { $lt: ["$distance", 1] },
                { $concat: [{ $toString: { $round: [{ $multiply: ["$distance", 1000] }, 0] } }, " m"] },
                { $concat: [{ $toString: { $round: ["$distance", 0] } }, " km"] },
              ],
            },
            distance_for_sorting: "$distance",
            store_loyalties: 1,
            rating: 1,
            rating_count: 1,
            promotions: 1,
            delivery_time: "$delivery_options.deliveryTime",
            latitude: { $arrayElemAt: ["$location.coordinates", 1] },
            longitude: { $arrayElemAt: ["$location.coordinates", 0] },
          },
        },

        { $sort: { is_onboarded: -1, distance_for_sorting: 1 } },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          },
        },
      ]);

      const merchants = merchantsAggregation[0]?.data || [];
      const totalMerchantDocuments = merchantsAggregation[0]?.metadata[0]?.total || 0;

      const page_count = Math.ceil(totalMerchantDocuments / limit);
      const data = {
        meta: { total_document: totalMerchantDocuments, page: page, limit, page_count },
        merchants,
      };

      return response.send(1, STATUS_CODE.OK, "merchants list", data, res, null);
    }
    catch (error) {
      console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching merchant list: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/merchants",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch merchant list",
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
 *   description: Merchant management operations
 */

/**
 * @swagger
 * /v1/web-app/merchant/get-all:
 *   post:
 *     summary: Retrieve all public merchants
 *     tags: [Web-Merchant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tag_id:
 *                 type: string
 *                 description: Optional tag ID to filter merchants
 *                 example: "605c72f5e4b0c8d07b742af9"
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     description: Longitude of the customer's location
 *                     example: -73.935242
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     description: Latitude of the customer's location
 *                     example: 40.730610
 *               page:
 *                 type: integer
 *                 description: Page number for pagination (default is 1)
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 description: Number of merchants to return per page (default is 10)
 *                 example: 10
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
