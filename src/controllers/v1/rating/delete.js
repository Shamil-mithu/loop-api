"use strict";

const { Rating } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, ERROR, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    params: Joi.object().keys({
      ratingId: Joi.string().required(),
    }),
  }),
  async function deleteRatingsV1Controller(req, res) {
    try {
      const { ratingId } = req.params;

      const rating = await Rating.findOneAndUpdate(
        { _id: ratingId },
        { deleted_at: Date.now() },
        { new: true } // Return the updated document
      );

      if (!rating) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Rating does not exist or already deleted",
          null,
          res,
          ERROR.NOT_FOUND
        );
      }

      const data = { rating };
      return response.send(
        1,
        STATUS_CODE.OK,
        "Rating deleted successfully",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while deleting rating : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/rating/${req?.params?.ratingId}`,
        HTTP_VERBS.DELETE,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't delete rating",
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
 * /v1/rating/{ratingId}:
 *   delete:
 *     tags: [Rating]
 *     summary: Delete a rating
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         description: ID of the rating to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Rating deleted successfully
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
 *                   example: Rating deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     rating:
 *                       type: object
 *                       description: The deleted rating object
 *                       example: {}
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
 *                   example: Rating does not exist or already deleted
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
