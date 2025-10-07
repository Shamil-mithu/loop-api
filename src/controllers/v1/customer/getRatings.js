"use strict";

const { Rating, Language, SystemLocalization } = require("@src/models");
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

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    query: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
  }),
  async function getAllRatingsV1Controller(req, res) {
    try {
      let { limit, page } = req.query;
      const { customer } = req;
      page = page - 1;

      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      const ratings = await Rating.find({
        customer_id: customer.id,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        status: RATING_STATUS.APPROVED,
      })
        .sort({ created_at: "desc" })
        .select({ updated_at: 0 })
        .limit(limit)
        .skip(limit * page)
        .populate("merchant_id", "name + logo"); // Populate customer_id field with name from Customer collection

      const totalRatings = await Rating.countDocuments({
        customer_id: customer.id,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        status: RATING_STATUS.APPROVED,
      });

      const page_count = Math.ceil(totalRatings / limit);
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

      let data = {
        ratings: formattedRatings,
        meta,
      };

      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();

      if (customerLangId === defaultLangId) {
        return response.send(1, STATUS_CODE.OK, "Ratings", data, res, null);
      }

      const localizedRatings = await Promise.all(
        formattedRatings.map(async (rating) => {
          console.log(rating);
          const sysMessage = await SystemLocalization.findOne({
            eid: rating?.id.toString(),

            key: `${rating?.id}_rating_message`,
            lang_id: customer.default_language,
          });
          const sysImage = await SystemLocalization.findOne({
            eid: rating?.id.toString(),
            key: `${rating?.id}_rating_picture`,
            lang_id: customer.default_language,
          });

          if (sysMessage || sysImage) {
            rating.message = sysMessage?.value ?? rating.message;
            rating.picture = sysImage?.value ?? rating.picture;

            return rating;
          }
          return rating;
        })
      );

      data = {
        ratings: localizedRatings,
      };

      return response.send(1, STATUS_CODE.OK, "Ratings", data, res, null);
    } catch (error) {
      // console.log(error ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching ratings: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer/rating/get-all",
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


function formatDateDifference(date) {
    const now = new Date();
    const createdDate = new Date(date);
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return "1 day ago";
    } else if (diffDays > 1) {
        return `${diffDays} days ago`;
    } else {
        return `${diffDays} day ago`;
    }
}



/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: APIs for Customer Rating operations
 */

/**
 * @swagger
 * /v1/customer/rating/get-all:
 *   get:
 *     tags: [Customer]
 *     summary: Get all ratings for a customer
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         required: false
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         required: false
 *         description: Number of ratings per page
 *     responses:
 *       200:
 *         description: List of ratings
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
 *                   example: Ratings fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     ratings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: 60b6c0c2f1e3d826d8e3b6b1
 *                           customer_id:
 *                             type: string
 *                             example: 60b6c0c2f1e3d826d8e3b6b2
 *                           merchant_id:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 60b6c0c2f1e3d826d8e3b6b3
 *                               name:
 *                                 type: string
 *                                 example: Merchant Name
 *                               logo:
 *                                 type: string
 *                                 example: merchant-logo-url
 *                           ratings:
 *                             type: number
 *                             example: 4.5
 *                           message:
 *                             type: string
 *                             example: Excellent service!
 *                           picture:
 *                             type: string
 *                             example: https://example.com/review-picture.jpg
 *                           is_recommended_by_me:
 *                             type: boolean
 *                             example: true
 *                           most_impressed_feature:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["Speed", "Quality"]
 *                           status:
 *                             type: string
 *                             example: APPROVED
 *                           created_at:
 *                             type: string
 *                             example: 2021-06-01T12:34:56.789Z
 *                           updated_at:
 *                             type: string
 *                             example: 2021-06-02T08:00:00.000Z
 *                     meta:
 *                       type: object
 *                       properties:
 *                         total_document:
 *                           type: integer
 *                           example: 100
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         page_count:
 *                           type: integer
 *                           example: 10
 *       500:
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
 *                   example: Internal Server Error
 */
