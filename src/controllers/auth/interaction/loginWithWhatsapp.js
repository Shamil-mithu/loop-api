"use strict";

const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const { Otp, Settings } = require("@src/models");
const bodyParser = require("body-parser");
const { response, insertMessageLog } = require("@src/utils");
const {
  ERROR,
  STATUS_CODE,
  OTP_PURPOSES,
  OTP_SENDER_PLATFORM,
  LOG_TYPE,
  HTTP_VERBS,
  SETTINGS_KEYS
} = require("@src/constants");
const jwt = require("jsonwebtoken");
const { OTP } = require("@src/services");
const { Whatsapp } = require("@src/lib");
const SECRET_KEY = process.env.JWT_AUTH_SECRET;

//------------------------------------CONTROLLER-------------------------------------

const CONTROLLER = [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  validate({
    body: Joi.object().keys({
      phone_number: Joi.object()
        .keys({
          code: Joi.string().required(),
          number: Joi.string().required(),
        })
        .required(),
    }),
  }),
  async function loginInteraction(req, res) {
    try {
      const { phone_number } = req.body;
      const ph_num =
        (phone_number.code.startsWith("+")
          ? phone_number.code
          : `+${phone_number.code}`) + phone_number.number;

      let otp;
      const whatsappOtpSetting = await Settings.findOne({
        key: SETTINGS_KEYS.STOP_WHATSAPP_OTP_SERVICE
      })
      if (whatsappOtpSetting?.value == 'false') {
        otp = await OTP.otpGenerator(6);
      } else {
        otp = '123456'; // Default OTP for testing purposes
      }

      const payload = {
        phone_number: ph_num,
      };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "5m" });
      const data = {
        token,
      };

      const deleteExistingOtp = await Otp.findOneAndDelete({
        identifier: ph_num,
        purpose: OTP_PURPOSES.LOGIN,
      });
      const otpCreate = await Otp.create({
        code: otp,
        identifier: ph_num,
        purpose: OTP_PURPOSES.LOGIN,
        token,
        send_through: OTP_SENDER_PLATFORM.WHATSAPP,
      });
      if (!otpCreate) {
        return response.send(
          1,
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          `could not create new OTP`,
          data,
          res,
          ERROR.INTERNAL_SERVER_ERROR
        );
      }
      let number = `${otpCreate.identifier.substring(1)}`;
      if (whatsappOtpSetting?.value == 'false') {
        await Whatsapp.sendOtpThroughWhatsapp.send(otpCreate.code, number);
      }

      return response.send(1, STATUS_CODE.OK, `otp send`, data, res, null);
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while loggingIn: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/auth/interaction/login:",
        HTTP_VERBS.POST,
        null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't login",
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
 * /v1/auth/interaction/login/whatsapp:
 *   post:
 *     tags: [Authentication]
 *     summary: Initiate login process
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone_number:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   number:
 *                     type: string
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
 *                   example: OTP sent
 *                 data:
 *                   type: object
 *                   properties:
 *                     otp:
 *                       type: string
 *                       example: "123456"
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZV9udW1iZXIiOiI5ODc3NzczNzczNzciLCJvcHQiOiI1IiwiaWF0IjoxNTE2MjM5MDIyfQ.OHYciR-2XH2R5qFwtsCHz9YYdX3w9nPHlQsQ4gqRvys"
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
 *                   example: Could not create new OTP
 */