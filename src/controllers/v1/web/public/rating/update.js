"use strict";

const { Rating } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  RATING_STATUS,
  ERROR,
  STATUS_CODE,
  S3_ACL,
  S3_UPLOAD_FOLDER,
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

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      rating: Joi.number().integer().min(1).max(5).optional(),
      message: Joi.string().optional(),
      picture: Joi.string().optional().allow(""),
      merchant_id: Joi.string().required(),
    }),
    params: Joi.object().keys({
      ratingId: Joi.string().required(),
    }),
  }),
  async function updateRatingV1Controller(req, res) {
    try {
      const {
        customer,
        body: { rating, message, picture, merchant_id },
      } = req;
      const { ratingId } = req.params;
      let attachmentUrl = "";
      const isRating = await Rating.findOne({
        _id: ratingId,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        status: RATING_STATUS.APPROVED,
      });
      if (!isRating) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "rating does not exist",
          null,
          res,
          ERROR.NOT_FOUND
        );
      }

      // Check if picture is provided in the request body
      if (picture?.length > 0) {
        const fileInfo = getFileInfoFromBase64(picture);
        const base64Data = picture.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const { fileExtension, mimeType } = fileInfo;

        const folder = S3_UPLOAD_FOLDER.RATING;
        const metadata = { customer: customer.id };

        const transformedBuffer = await S3.prepareForS3Upload(buffer);
        const filePath = await S3.upload(
          `${folder}/${merchant_id}`,
          fileExtension,
          mimeType,
          transformedBuffer,
          S3_ACL.PUBLIC,
          metadata
        );

        attachmentUrl = `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
      }

      // Create an object to store the fields to be updated
      const updateFields = {
        message,
        ratings: rating,
        status: RATING_STATUS.APPROVED,
      };

      // If picture is provided, add it to the updateFields object
      if (picture?.length > 0) {
        updateFields.picture = attachmentUrl;
      }

      const updatedRating = await Rating.findOneAndUpdate(
        { _id: ratingId },
        updateFields,
        { new: true }
      );
      if (!updatedRating) {
        return response.send(
          0,
          STATUS_CODE.OK,
          "rating not found",
          null,
          res,
          null
        );
      }

      const data = {
        updatedRating,
      };

      return response.send(
        1,
        STATUS_CODE.OK,
        "Your feedback has been updated",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating rating : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/rating/${req?.params?.ratingId}`,
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't update rating",
        null,
        res,
        error
      );
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
 * /v1/rating/{ratingId}:
 *   put:
 *     tags: [Rating]
 *     summary: Update a rating for a specific merchant
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         description: ID of the rating to be updated
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
 *                 example: "Updated feedback message"
 *               picture:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded image data (optional)
 *               merchant_id:
 *                 type: string
 *                 example: "merchantId123"
 *             required:
 *               - merchant_id
 *     responses:
 *       '200':
 *         description: Rating updated successfully
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
 *                   example: Your feedback has been updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedRating:
 *                       type: object
 *                       description: The updated rating object
 *       '404':
 *         description: Rating not found
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
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: Rating does not exist
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
