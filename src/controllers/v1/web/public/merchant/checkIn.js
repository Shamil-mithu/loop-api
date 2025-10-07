"use strict";

const {
  Merchant,
  CustomerBalance,
  Currency,
  MerchantQrCode,
} = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  LOG_TYPE,
  HTTP_VERBS,
  MERCHANT_TYPE,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { custom } = require("joi");

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
      let merchant = await Merchant.findOne({
        type: MERCHANT_TYPE.DEFAULT,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        is_published: true,
        _id: merchantId,
      });
      //
      let merchantQrCode;
      if (!merchant) {
        //merchant QR check
        merchantQrCode = await MerchantQrCode.findOne({
          _id: merchantId,
        }).populate("merchant_id");
      }

      if (!merchant && !merchantQrCode) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          merchant ? "invalid QR code" : "restaurant is not active",
          null,
          res,
          null
        );
      }

      const networkMerchant = await Merchant.findOne({
        type: MERCHANT_TYPE.INTERNAL,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      const brandBalance = await CustomerBalance.findOne({
        reference_id:
          merchant?.brand_id ?? merchantQrCode?.merchant_id?.brand_id,
        reference_type: "brand",
        customerId: customer.id,
      });

      const networkBalance = await CustomerBalance.findOne({
        reference_id: networkMerchant.brand_id,
        reference_type: "brand",
        customerId: customer.id,
      });
      const merchantCurrency = await Currency.findOne({
        code: merchant.currency,
      });
      // const saudiCurrency = await Currency.findOne({
      //   code: "SAR",
      // });
      const pointsToCurrencyValue =
      merchantCurrency.point_rate *
        ((brandBalance?.balance ?? 0) + (networkBalance?.balance ?? 0));
      const points =
        (brandBalance?.balance ?? 0) + (networkBalance?.balance ?? 0);

      const data = {
        merchant_id: merchant?.id ?? merchantQrCode?.merchant_id?.id,
        label: merchantQrCode?.label ?? "",
        name: merchant?.name ?? merchantQrCode?.merchant_id?.name,
        balance: pointsToCurrencyValue,
        logo: merchant?.logo ?? merchantQrCode?.merchant_id?.logo,
        cover_image:
          merchant?.cover_image ?? merchantQrCode?.merchant_id?.cover_image,
        points: points,
        currency : merchant.currency
      };
      return response.send(
        1,
        STATUS_CODE.OK,
        "check in successful",
        data,
        res,
        null
      );
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while hitting check-in api : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/merchant/check-in/${req?.params?.merchantId}`,
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't check-in to the merchant",
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
 * /v1/merchant/check-in/{merchantId}:
 *   get:
 *     tags: [Merchant]
 *     summary: check in to a merchant
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         description: ID of the merchant to check in
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
