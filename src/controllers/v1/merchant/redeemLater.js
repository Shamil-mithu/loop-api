"use strict";

const { Merchant, VendorCustomerSession } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS,MERCHANT_TYPE ,VENDOR_CUSTOMER_SESSION_STATUS} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const socket = require('@root/socket');

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    params: Joi.object().keys({
      merchantId: Joi.string().required(),
    }),
  }),
  async function checkInV1Controller(req, res) {
    try {
      const { customer } = req;
      const { merchantId } = req.params;

      // Find the vibe to check if the customer has already liked it
      const merchant = await Merchant.findOne({
        type: MERCHANT_TYPE.DEFAULT, $or: [
            { deleted_at: { $exists: false } },
            { deleted_at: null }
          ],
          is_published: true,
        _id: merchantId,
      });
      if (!merchant) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "invalid QR code",
          null,
          res,
          null
        );
      }
      const vendorCustomerSession = await VendorCustomerSession.updateOne({
        customer_id: customer.id,
        device_id: null,
        allow_redeem: true,
        status: VENDOR_CUSTOMER_SESSION_STATUS.ACTIVE,      
      }, {
        status: VENDOR_CUSTOMER_SESSION_STATUS.INACTIVE,
    },{
        new : true
    })
      socket.emit('device_sessions_updated')
      
      return response.send(1, STATUS_CODE.OK, 'redeem later, session updated', null, res, null);
    } catch (error) {
      console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while hitting redeem-later api : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/merchant/redeem-later/${req?.params?.merchantId}`,
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't redeem later to the merchant",
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
 * /v1/merchant/check-in/redeem-later/{merchantId}:
 *   put:
 *     tags: [Merchant]
 *     summary: redeem later to a merchant
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         description: ID of the merchant to redeem later
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
