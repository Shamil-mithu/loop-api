"use strict";

const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const { Customer, Otp } = require("@src/models");
const bodyParser = require("body-parser");
const { response, insertMessageLog } = require("@src/utils");
const {
  ERROR,
  STATUS_CODE,
  OTP_PURPOSES,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { OTP } = require("@src/services");
const jwt = require("jsonwebtoken");
const { sendGridMail } = require("@src/utils");
const SECRET_KEY = process.env.JWT_AUTH_SECRET;

const CONTROLLER = [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  validate({
    body: Joi.object()
      .keys({
        email: Joi.string().required(),
      })
      .required(),
  }),
  async function isEmailExistV1Controller(req, res) {
    try {
      const { email } = req.body;

      const customer = await Customer.countDocuments({
        email: email,
        deleted_at: { $exists: false },
      });

      if (customer > 0) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          "Email already exist",
          null,
          res,
          ERROR.EMAIL_ALREADY_EXIST
        );
      } else {
        const otp = OTP.otpGenerator();
        const payload = {
          email: email,
        };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "5m" });
        const deleteExistingOtp = await Otp.findOneAndDelete({
          identifier: email,
        });

        const newOtp = await Otp.create({
          code: otp,
          purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
          token: token,
          identifier: email,
        });
        if (!newOtp) {
          return response.send(
            0,
            STATUS_CODE.INTERNAL_SERVER_ERROR,
            "could not create otp",
            null,
            res,
            null
          );
        }
        const data = {
          otp: otp,
          token,
        };

        const resp = await sendGridMail.sendEmailVerificationOtp(email, otp);
        if (resp == true)
          return response.send(
            1,
            STATUS_CODE.OK,
            "email verification OTP sent",
            data,
            res,
            null
          );
        else {
          return response.send(
            0,
            STATUS_CODE.OK,
            `error sending email OTP : ${resp?.response?.body.errors[0].message}`,
            null,
            res,
            resp?.response?.body
          );
        }
      }
    } catch (error) {
      //   console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while sending OTP: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/auth/customer/is-email-exist",
        HTTP_VERBS.POST,
        null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't send OTP",
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
 * /v1/auth/customer/is-email-exist:
 *   post:
 *     tags: [Authentication]
 *     summary: Initiate email verification process
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
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
 *                   example: email verification otp sent
 *                 data:
 *                   type: object
 *                   properties:
 *                     otp:
 *                       type: string
 *                       example: "123456"
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImVtYWlsQGV4YW1wbGUuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.OHYciR-2XH2R5qFwtsCHz9YYdX3w9nPHlQsQ4gqRvys"
 *       409:
 *         description: Email already exists
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
 *                   example: Email already exist
 *                 error:
 *                   type: string
 *                   example: EMAIL_ALREADY_EXIST
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
