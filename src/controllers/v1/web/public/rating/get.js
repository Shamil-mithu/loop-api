"use strict";

const { Rating, Customer } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  RATING_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");

// Helper function to format date difference
function formatDateDifference(date) {
  const now = new Date();
  const createdDate = new Date(date);
  const diffTime = now - createdDate;

  const diffSeconds = Math.floor(diffTime / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffMonths / 12);

  if (diffSeconds < 60) {
    return diffSeconds === 1 ? "1 second ago" : `${diffSeconds} seconds ago`;
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  } else if (diffDays < 30) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
  } else {
    return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
  }
}

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    query: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
    params: Joi.object().keys({
      merchantId: Joi.string().required(),
    }),
  }),
  async function getAllRatingsV1Controller(req, res) {
    try {
      let { limit, page } = req.query;
      const { merchantId } = req.params;
      page = page - 1;

      const ratings = await Rating.find({
        merchant_id: merchantId,
        deleted_at: { $exists: false }, // Exclude deleted ratings
        status: RATING_STATUS.APPROVED, // Only approved ratings
        is_published: true, // Only return published ratings
      })
        .sort({ created_at: "desc" })
        .select({ updated_at: 0 })
        .limit(limit)
        .skip(limit * page)
        .populate("customer_id", "name"); // Populate customer_id field with name from Customer collection

      const totalRatings = await Rating.countDocuments({
        merchant_id: merchantId,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        status: RATING_STATUS.APPROVED,
      });
      const page_count = Math.ceil(totalRatings / limit);

      // Calculate the sum and average rating
      let sum = 0;
      ratings.forEach((rating) => {
        sum += rating.ratings;
      });
      let avgRating;
      sum == 0
        ? (avgRating = 0)
        : (avgRating = (sum / totalRatings).toPrecision(2));

      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      ratings.forEach((rating) => {
        const ratingValue = rating.ratings;
        ratingCounts[ratingValue]++;
      });

      const formattedRatings = ratings.map((rating) => ({
        ...rating.toJSON(),
        created_at: formatDateDifference(rating.created_at),
      }));

      const meta = {
        total_document: totalRatings,
        page: page + 1,
        limit,
        page_count,
      };

      const data = {
        ratings: formattedRatings,
        meta,
        average_rating: avgRating,
        ratingCounts,
        totalRatings,
      };

      return response.send(1, STATUS_CODE.OK, "Ratings", data, res, null);
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching ratings : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/rating/get-all/${req?.params?.merchantId}`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch ratings",
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
 *   name: Rating
 *   description: APIs for rating operations
 */

/**
 * @swagger
 * /v1/rating/get-all/{merchantId}:
 *   get:
 *     tags: [Rating]
 *     summary: Get all ratings for a specific merchant
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         description: ID of the merchant
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         required: false
 *         description: The page number for pagination (default is 1)
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: The number of ratings to return per page (default is 10)
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       '200':
 *         description: List of ratings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Ratings
 *                 data:
 *                   type: object
 *                   properties:
 *                     ratings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           merchant_id:
 *                             type: string
 *                           customer_id:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                           ratings:
 *                             type: number
 *                             description: Rating value between 1 and 5
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     meta:
 *                       type: object
 *                       properties:
 *                         total_document:
 *                           type: integer
 *                           example: 10
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         page_count:
 *                           type: integer
 *                           example: 2
 *                     average_rating:
 *                       type: string
 *                       example: "3.50"
 *                     ratingCounts:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                         example: 3
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
 *                 status_code:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: Error details here
 */
