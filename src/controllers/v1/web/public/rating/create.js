"use strict";

const { Rating, SystemLocalization } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  RATING_STATUS,
  STATUS_CODE,
  S3_ACL,
  S3_UPLOAD_FOLDER,
  RESPONSE_ACTION,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const {
  response,
  getFileInfoFromBase64: { getFileInfoFromBase64 },
  insertMessageLog,
} = require("@src/utils");
const { Joi, S3 } = require("@src/lib");
const { S3_ENDPOINT, S3_CDN_URL, S3_BUCKET } = require("@src/config");
const { S3Error } = require("@src/errors");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  validate({
    body: Joi.object().keys({
      rating: Joi.number().integer().min(1).max(5).required(),
      message: Joi.string().optional().allow(""),
      picture: Joi.string().optional().allow(""),
      most_impressed_feature: Joi.array().items(Joi.string()).optional(),
      is_recommended_by_me: Joi.boolean().optional(),
    }),
    params: Joi.object().keys({
      merchantId: Joi.string().required(),
    }),
  }),
  async function createRatingV1Controller(req, res) {
    try {
      const {
        customer,
        body: {
          rating,
          message,
          picture,
          most_impressed_feature,
          is_recommended_by_me,
        },
      } = req;
      const { merchantId } = req.params;
      let attachmentUrl = "";
      if (picture?.length > 0) {
        const fileInfo = getFileInfoFromBase64(picture);
        const base64Data = picture.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const { fileExtension, mimeType } = fileInfo;

        const folder = S3_UPLOAD_FOLDER.RATING;
        const metadata = { customer: customer.id };

        const transformedBuffer = await S3.prepareForS3Upload(buffer);
        const filePath = await S3.upload(
          `${folder}/${merchantId}`,
          fileExtension,
          mimeType,
          transformedBuffer,
          S3_ACL.PUBLIC,
          metadata
        );

        attachmentUrl = `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
      }
      const newRating = await Rating.create({
        merchant_id: merchantId,
        customer_id: customer.id,
        message,
        ratings: rating,
        status: RATING_STATUS.PENDING,
        picture: attachmentUrl?.length > 0 ? attachmentUrl : null,
        is_recommended_by_me: is_recommended_by_me,
        most_impressed_feature: most_impressed_feature,
      });

      const data = {
        newRating,
      };
      const sys_localization = await SystemLocalization.findOne({
        eid: customer.default_language,
        key: `${customer.default_language}_response_${RESPONSE_ACTION.YOUR_FEEDBACK_HAS_BEEN_SUBMITTED}`,
        lang_id: customer.default_language,
      });

      const responseMessage =
        customer.default_language == req.default_language || !sys_localization
          ? "your feedback has been submitted"
          : sys_localization.value;

      return response.send(1, STATUS_CODE.OK, responseMessage, data, res, null);
    } catch (error) {
      console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while posting a rating : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/rating/create/${req?.param?.merchantId}`,
        HTTP_VERBS.POST,
        req?.customer?.id || null
      );
      if (error instanceof S3Error) {
        response.send(
          0,
          error.status_code,
          "Couldn't post a rating",
          null,
          res,
          error.details
        );
      } else {
        response.send(
          0,
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          "Couldn't post a rating",
          null,
          res,
          error
        );
      }
    }
  },
];

module.exports = CONTROLLER


/**
 * @swagger
 * tags:
 *   name: Rating
 *   description: APIs for rating operations
 */

/**
 * @swagger
 * /v1/rating/create/{merchantId}:
 *   post:
 *     tags: [Rating]
 *     summary: Create a new rating for a specific merchant
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         description: ID of the merchant
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               message:
 *                 type: string
 *                 example: "Great experience with this merchant!"
 *               picture:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded image data (optional)
 *               most_impressed_feature:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Quality", "Service"]
 *               is_recommended_by_me:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       '200':
 *         description: Rating created successfully
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
 *                   example: "Your feedback has been submitted"
 *                 data:
 *                   type: object
 *                   properties:
 *                     newRating:
 *                       type: object
 *                       properties:
 *                         merchant_id:
 *                           type: string
 *                           example: "merchantId123"
 *                         customer_id:
 *                           type: string
 *                           example: "customerId456"
 *                         message:
 *                           type: string
 *                           example: "Great experience with this merchant!"
 *                         ratings:
 *                           type: integer
 *                           example: 4
 *                         status:
 *                           type: string
 *                           example: "PENDING"
 *                         picture:
 *                           type: string
 *                           example: "https://example.com/path/to/image.jpg"
 *                         is_recommended_by_me:
 *                           type: boolean
 *                           example: true
 *                         most_impressed_feature:
 *                           type: array
 *                           items:
 *                             type: string
 *                             example: ["Quality", "Service"]
 *       '400':
 *         description: Bad request due to validation errors
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
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Validation error"
 *                 error:
 *                   type: object
 *                   properties:
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           message:
 *                             type: string
 *                             example: "Validation failed for field 'rating'"
 *                           path:
 *                             type: array
 *                             items:
 *                               type: string
 *                               example: ["rating"]
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
 *                   example: "Internal server error"
 *                 error:
 *                   type: string
 *                   example: "Error details here"
 */
