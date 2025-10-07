"use strict";

const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const { Customer, Otp } = require("@src/models");
const bodyParser = require("body-parser");
const { response, insertMessageLog } = require("@src/utils");
const { ERROR, STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_AUTH_SECRET;

const CONTROLLER = [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  validate({
    body: Joi.object()
      .keys({
        otp: Joi.string().required(),
        token: Joi.string().required(),
        email: Joi.string().required(),
      })
      .required(),
  }),
  async function verifyEmailOTP(req, res) {
    try {
      const { otp, email, token } = req.body;
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.email != email) {
        return response.send(
          0,
          STATUS_CODE.UNAUTHORIZED,
          `OTP expired or invalid`,
          null,
          res,
          ERROR.UNAUTHORIZED
        );
      }

      const isOtp = await Otp.findOne({
        code: otp,
        token,
        deleted_at: { $exists: false },
      });
      if (!isOtp) {
        return response.send(
          0,
          STATUS_CODE.FORBIDDEN,
          `OTP expired or invalid`,
          null,
          res,
          ERROR.FORBIDDEN
        );
      }
      isOtp.deleted_at = Date.now();
      await isOtp.save();
      return response.send(
        1,
        STATUS_CODE.OK,
        `Email verified`,
        null,
        res,
        null
      );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while verifying email: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/auth/customer/verify-email",
        HTTP_VERBS.POST,
       null
      );
      if (error instanceof (jwt.JsonWebTokenError || jwt.TokenExpiredError)) {
        return response.send(
          0,
          STATUS_CODE.FORBIDDEN,
          "couldn't verify email",
          null,
          res,
          error
        );
      }
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't verify email",
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
 *   name: Authentication
 *   description: APIs for customer authentication
 */

/**
 * @swagger
 * /v1/auth/customer/verify-email:
 *   post:
 *     tags: [Authentication]
 *     summary: Verify email using OTP and token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *               token:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Email verified
 *       401:
 *         description: Unauthorized - OTP expired or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: OTP expired or invalid
 *                 error:
 *                   type: string
 *                   example: UNAUTHORIZED
 *       403:
 *         description: Forbidden - OTP expired or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: OTP expired or invalid
 *                 error:
 *                   type: string
 *                   example: FORBIDDEN
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: Error message
 */
