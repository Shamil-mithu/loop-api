"use strict";

const { MerchantPromotionTag } = require("@src/models");
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
      merchantPromotionTagId: Joi.string().required(),
    }),
  }),
  async function markSeenPromotionV1Controller(req, res) {
    try {
      const { customer } = req;
      const { merchantPromotionTagId } = req.params;

      const promotion = await MerchantPromotionTag.findOneAndUpdate(
        {
          _id: merchantPromotionTagId,
          deleted_at: { $exists: false },
        },
        { $addToSet: { read_by: customer.id } },
        { new: true }
      );
      if (!promotion) {
        return res.send("promotion not exists");
      }

      return response.send(
        1,
        STATUS_CODE.OK,
        "promotion seen",
        promotion,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching promotion seen status: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/merchant/promotion/read/${req?.params?.merchantPromotionTagId}`,
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch promotion seen status",
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
 * /v1/merchant/promotion/read/{merchantPromotionTagId}:
 *   put:
 *     tags: [Merchant]
 *     summary: Mark a merchant promotion as seen
 *     parameters:
 *       - in: path
 *         name: merchantPromotionTagId
 *         required: true
 *         description: ID of the merchant promotion to mark as seen
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation indicating the promotion has been marked as seen
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
 *                   example: promotion seen
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The ID of the promotion
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     image:
 *                       type: string
 *                     brand_id:
 *                       type: string
 *                       description: The ID of the associated brand
 *                     merchant_id:
 *                       type: string
 *                       description: The ID of the associated merchant
 *                     read_by:
 *                       type: array
 *                       items:
 *                         type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                     created_by:
 *                       type: string
 *                     updated_by:
 *                       type: string
 *                     deleted_by:
 *                       type: string
 *       '404':
 *         description: Promotion not found
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
 *                   example: Promotion not exists
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
 *                   example: Could not mark promotion as seen
 */
