"use strict";

const { MerchantVibe, Language, SystemLocalization } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    params: Joi.object().keys({
      merchantVibeId: Joi.string().required(),
    }),
  }),
  async function likeAVibeV1Controller(req, res) {
    try {
      const { customer } = req;
      const { merchantVibeId } = req.params;

      // Find the vibe to check if the customer has already liked it
      const vibe = await MerchantVibe.findOne({
        deleted_at: { $exists: false },
        _id: merchantVibeId,
      });

      if (!vibe) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Vibe not found",
          null,
          res,
          null
        );
      }

      const alreadyLiked = vibe.liked_by.includes(customer.id);

      let update = {};
      if (alreadyLiked) {
        // If already liked, remove the customer.id and decrement likes
        update = {
          $pull: { liked_by: customer.id },
          $inc: { likes: -1 },
        };
      } else {
        update = {
          $addToSet: { liked_by: customer.id },
          $inc: { likes: 1 },
        };
      }

      const updatedVibe = await MerchantVibe.findOneAndUpdate(
        {
          deleted_at: { $exists: false },
          _id: merchantVibeId,
        },
        update,
        {
          new: true,
        }
      );

      const message = alreadyLiked ? "vibe unliked" : "vibe liked";
      return response.send(1, STATUS_CODE.OK, message, updatedVibe, res, null);
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating vibe's liked status : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/merchant/vibe/${req?.params?.merchantVibeId}`,
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't update vibe's liked status",
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
 * /v1/merchant/vibe/{merchantVibeId}:
 *   put:
 *     tags: [Merchant]
 *     summary: Like or unlike a merchant vibe
 *     parameters:
 *       - in: path
 *         name: merchantVibeId
 *         required: true
 *         description: ID of the merchant vibe to like or unlike
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation indicating the vibe has been liked or unliked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: integer
 *                   example: 1
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: vibe liked
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     liked_by:
 *                       type: array
 *                       items:
 *                         type: string
 *                     likes:
 *                       type: integer
 *                       example: 5
 *       '404':
 *         description: Vibe not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: Vibe not found
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: Could not like/unlike the merchant vibe
 */
