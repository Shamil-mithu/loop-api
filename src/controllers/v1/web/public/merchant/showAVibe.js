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
  async function showAVibeV1Controller(req, res) {
    try {
      const { customer } = req;
      const { merchantVibeId } = req.params;
      let updatedVibe = await MerchantVibe.findOneAndUpdate(
        {
          deleted_at: { $exists: false },
          _id: merchantVibeId,
        },
        {
          $addToSet: { seen_by: customer.id },
        },
        {
          new: true,
        }
      );
      return response.send(
        1,
        STATUS_CODE.OK,
        "vibe seen",
        updatedVibe,
        res,
        null
      );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching vibe seen: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/merchant/vibe/${req?.params?.merchantVibeId}`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch fetching vibe seen",
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
 *   get:
 *     tags: [Merchant]
 *     summary: Show a merchant vibe
 *     parameters:
 *       - in: path
 *         name: merchantVibeId
 *         required: true
 *         description: ID of the merchant vibe to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation, returning the merchant vibe details
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
 *                   example: vibe seen
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: The ID of the vibe
 *                     merchant_id:
 *                       type: string
 *                       description: The ID of the associated merchant
 *                     swipe_text:
 *                       type: string
 *                     vibe_category:
 *                       type: string
 *                       description: The ID of the associated vibe category
 *                     seen_by:
 *                       type: array
 *                       items:
 *                         type: string
 *                     likes:
 *                       type: integer
 *                       description: The number of likes
 *                     liked_by:
 *                       type: array
 *                       items:
 *                         type: string
 *                     image:
 *                       type: string
 *                     thumbnail:
 *                       type: string
 *                     isVideo:
 *                       type: boolean
 *                     expiry:
 *                       type: string
 *                       format: date-time
 *                     created_by:
 *                       type: string
 *                       description: The ID of the user who created the vibe
 *                     created_at:
 *                       type: string
 *                       format: date-time
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
 *                   example: Vibe not exists
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
 *                   example: Could not fetch merchant vibes
 */
