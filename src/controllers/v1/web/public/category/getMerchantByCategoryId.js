
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
const { response, formatCount, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  validate({
    body: Joi.object().keys({
      tag_id: Joi.string().allow(""),
      category_id: Joi.string().allow(""),
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
    const { tag_id, coordinates, limit = 10, page = 1 } = req.body;
    let { category_id } = req.body;
    const customerCoordinates = coordinates;
    const customerId = req?.customer?.id || null;

    if (!category_id) {
      const category = await Category.findOne({ name: 'Restaurants' }).lean();
      category_id = category ? [category._id] : [];
    } else if (!Array.isArray(category_id)) {
      category_id = [category_id];
    }

    const filter = {
      type: MERCHANT_TYPE.DEFAULT,
      $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      is_published: true,
      categories: { $in: category_id },
    };
    if (tag_id?.length > 0) {
      filter.merchant_tag_ids = { $in: tag_id };
    }

    const merchantsAggregation = await Merchant.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [customerCoordinates.longitude, customerCoordinates.latitude],
          },
          distanceField: 'distance',
          spherical: true,
        },
      },
      { $addFields: { distance: { $divide: ["$distance", 1000] } } }, // km
      { $match: filter },
      {
        $addFields: {
          deliveryRadius: { $ifNull: ["$delivery_options.deliveryRadius", 0] },
        },
      },
      { $match: { $expr: { $lte: ["$distance", "$deliveryRadius"] } } },

      {
        $lookup: {
          from: "merchant_type",
          localField: "merchant_type_ids",
          foreignField: "_id",
          as: "merchantTypes",
          pipeline: [{ $match: { deleted_at: { $exists: false } } }],
        },
      },
      {
        $lookup: {
          from: "merchant_tags",
          localField: "merchant_tag_ids",
          foreignField: "_id",
          as: "merchantTags",
          pipeline: [{ $match: { deleted_at: { $exists: false } } }],
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
                totalRating: { $sum: "$ratings" },
                totalCount: { $sum: 1 },
              },
            },
          ],
          as: "ratingInfo",
        },
      },
      {
        $addFields: {
          rating: {
            $cond: [
              { $gt: [{ $size: "$ratingInfo" }, 0] },
              { $divide: [{ $arrayElemAt: ["$ratingInfo.totalRating", 0] }, { $arrayElemAt: ["$ratingInfo.totalCount", 0] }] },
              0,
            ],
          },
          rating_count: { $ifNull: [{ $arrayElemAt: ["$ratingInfo.totalCount", 0] }, 0] },
        },
      },

      {
        $lookup: {
          from: "merchant_promotion_tag",
          let: { merchantId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$merchant_id", "$$merchantId"] }, deleted_at: { $exists: false } } },
            { $sort: { created_at: -1 } },
            { $limit: 1 },
          ],
          as: "promotion",
        },
      },
      { $addFields: { promotion: { $arrayElemAt: ["$promotion", 0] } } },

      {
        $lookup: {
          from: "store_loyalty",
          let: { merchantId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$merchant_id", "$$merchantId"] }, deleted_at: { $exists: false } } },
          ],
          as: "store_loyalties",
        },
      },

      {
        $lookup: {
          from: "membership_claim",
          let: { merchantId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$merchant_id", "$$merchantId"] }, { $eq: ["$customer_id", customerId] }] } } },
            { $limit: 1 },
          ],
          as: "membershipClaim",
        },
      },
      {
        $addFields: {
          is_membership_claimed: { $gt: [{ $size: "$membershipClaim" }, 0] },
        },
      },

      {
        $project: {
          id: "$_id",
          listing_image: { $ifNull: ["$listing_image", ""] },
          name: 1,
          logo: { $ifNull: ["$logo", ""] },
          types: "$merchantTypes.name",
          cashback_percentage: "$cashback_percent",
          tag_ids: "$merchant_tag_ids",
          tags: "$merchantTags.name",
          distance: { $round: ["$distance", 0] },
          distance_for_sorting: "$distance",
          store_loyalties: 1,
          rating: { $round: ["$rating", 1] },
          rating_count: 1,
          promotions: "$promotion",
          delivery_time: "$delivery_options.deliveryTime",
          is_membership_claimed: 1,
          latitude: { $arrayElemAt: ["$location.coordinates", 1] },
          longitude: { $arrayElemAt: ["$location.coordinates", 0] },
        },
      },

      { $sort: { is_onboarded: -1, distance: 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        },
      },
    ]);

    const merchants = merchantsAggregation[0]?.data || [];
    const totalMerchantDocuments = merchantsAggregation[0]?.metadata[0]?.total || 0;

    const data = {
      meta: {
        total_document: totalMerchantDocuments,
        page,
        limit,
        page_count: Math.ceil(totalMerchantDocuments / limit),
      },
      merchants,
    };

    return response.send(1, STATUS_CODE.OK, "merchants list", data, res, null);
  } catch (error) {
    insertMessageLog(
      LOG_TYPE.ERROR,
      `Exception while fetching merchants list by CategoryID : ${error?.message}`,
      { message: error?.message, stack: error?.stack, errorObject: error },
      "/v1/web-app/category/merchant",
      HTTP_VERBS.GET,
      req?.customer?.id || null
    );
    return response.send(
      0,
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "Couldn't fetch merchants list by CategoryID",
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
 *   name: Web-Category
 *   description: APIs for category operations
 */

/**
 * @swagger
 * /v1/web-app/category/merchant:
 *   post:
 *     tags: [Web-Category]
 *     summary: Get merchants with optional filtering by category ID, tag ID, or coordinates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tag_id:
 *                 type: string
 *                 description: ID of the merchant tag (optional)
 *                 example: "60c72b2f5f9b2568a2a08d33"
 *               category_id:
 *                 type: string
 *                 description: ID of the category (optional, defaults to "Restaurant" category if empty)
 *                 example: "60c72b2f5f9b2568a2a08d35"
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
 *       200:
 *         description: Successful response with merchants list
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
 *                       description: Total number of merchants found
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       description: Limit of merchants per page
 *                       example: 10
 *                     page_count:
 *                       type: integer
 *                       description: Total number of pages available
 *                       example: 5
 *                 merchants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID of the merchant
 *                         example: "60c72b2f5f9b2568a2a08d33"
 *                       name:
 *                         type: string
 *                         description: Name of the merchant
 *                         example: "Merchant A"
 *                       logo:
 *                         type: string
 *                         description: URL of the merchant's logo
 *                         example: "https://example.com/logo.png"
 *                       listing_image:
 *                         type: string
 *                         description: URL of the merchant's listing image
 *                         example: "https://example.com/listing.png"
 *                       cashback_percentage:
 *                         type: number
 *                         description: Cashback percentage offered by the merchant
 *                         example: 5
 *                       distance:
 *                         type: number
 *                         description: Distance from the customer in kilometers
 *                         example: 2
 *                       rating:
 *                         type: number
 *                         description: Average rating of the merchant
 *                         example: 4.5
 *                       rating_count:
 *                         type: integer
 *                         description: Total number of ratings
 *                         example: 100
 *                       promotions:
 *                         type: object
 *                         description: Promotion details for the merchant (if available)
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "promotion_id"
 *                           name:
 *                             type: string
 *                             example: "Summer Sale"
 *                       store_loyalties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "loyalty_id"
 *                             name:
 *                               type: string
 *                               example: "Loyalty Program"
 *                       is_membership_claimed:
 *                         type: boolean
 *                         description: Whether the customer has claimed membership with the merchant
 *                         example: true
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
 *                   example: "Could not fetch data"
 */
