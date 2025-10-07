"use strict";

const { MerchantVibe } = require("@src/models");
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
  async function markSeenVibeV1Controller(req, res) {
    try {
      const { customer } = req;
      const { merchantVibeId } = req.params;

      const vibe = await MerchantVibe.findOneAndUpdate(
        {
          _id: merchantVibeId,
          deleted_at: { $exists: false },
        },
        { $addToSet: { seen_by: customer.id } },
        { new: true }
      );

      return response.send(1, STATUS_CODE.OK, "vibe seen", vibe, res, null);
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating vibe's seen status: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/merchant/vibe/seen/${req?.params?.merchantVibeId}`,
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't update vibe's seen status",
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
 * /v1/merchant/vibe/seen/{merchantVibeId}:
 *   put:
 *     tags: [Merchant]
 *     summary: Mark a merchant vibe as seen
 *     parameters:
 *       - in: path
 *         name: merchantVibeId
 *         required: true
 *         description: ID of the merchant vibe to mark as seen
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful operation indicating the vibe has been marked as seen
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
 *                     _id:
 *                       type: string
 *                     seen_by:
 *                       type: array
 *                       items:
 *                         type: string
 *       '404':
 *         description: Vibe not found or already marked as seen
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
 *                   example: Could not mark vibe as seen
 */
