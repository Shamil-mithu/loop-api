"use strict";

const { Merchant, Otp } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken')
const {
  STATUS_CODE,
  ERROR,
  OTP_PURPOSES,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const crypto = require("crypto");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      merchant_id: Joi.string().required(),
    }),
  }),
  async function createRedemptionCodeV1Controller(req, res) {
    try {
      const SECRET_KEY = process.env.JWT_AUTH_SECRET;
      const { merchant_id } = req.body;
      const { customer } = req;
      const merchant = await Merchant.findOne({
        _id: merchant_id,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      if (!merchant) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "merchant not found",
          null,
          res,
          ERROR.NOT_FOUND
        );
      }
      const { unique_code } = merchant;
      const code = await generate6DigitCode(unique_code);
      const deleteExistingOtp = await Otp.findOneAndDelete({
        identifier: `REDEEM_${merchant_id}_${customer.id}`,
      });
      const payload = {
        customer_id: customer.id,
        merchant_id: merchant.id,
        code: code,
      };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1m" });

      const otp = await Otp.create({
        token: token,
        code: code,
        identifier: `REDEEM_${merchant_id}_${customer.id}`,
        purpose: OTP_PURPOSES.REDEMPTION_CODE,
      });
      const data = {
        code: code,
      };
      return response.send(
        1,
        STATUS_CODE.OK,
        "This code will expire in 1 minute",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while  : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/merchant/get-redemption-code",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't ",
        null,
        res,
        error
      );
    }
  },
];

async function generate6DigitCode(uniqueCode) {
    const uniqueString = `${uniqueCode}-${Date.now()}`;
    const hash = crypto.createHash('sha256').update(uniqueString).digest('hex');
    const code = parseInt(hash.substring(0, 6), 16) % 1000000;

    return code.toString().padStart(6, '0');
}

// -----------------------------------------EXPORTS---------------------------------------------------------
module.exports = CONTROLLER;

/**
 * @swagger
 * /v1/merchant/get-redemption-code:
 *   post:
 *     tags: [Merchant]
 *     summary: Generate a redemption code for a merchant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               merchant_id:
 *                 type: string
 *                 example: "60c72b2f9b1d8c001c8e4b9a"
 *     responses:
 *       200:
 *         description: Redemption code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: integer
 *                   example: 1
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: This code will expire in 1 minute
 *                 data:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "123456"
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: integer
 *                   example: 0
 *                 statusCode:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: merchant not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: integer
 *                   example: 0
 *                 statusCode:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
