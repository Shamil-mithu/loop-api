"use strict";

const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const { Customer, Otp, MembershipClaim, UserSession } = require("@src/models");
const bodyParser = require("body-parser");
const { response, extractUserAgentData, insertMessageLog } = require("@src/utils");
const {
  ERROR,
  STATUS_CODE,
  MINTING_STATUS,
  USER_SESSION_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_AUTH_SECRET;

const CONTROLLER = [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  validate({
    body: Joi.object()
      .keys({
        otp: Joi.string().required(),
        mobile_type: Joi.string().optional(),
        default_lang: Joi.optional(),
        token: Joi.string().required(),
        phone_number: Joi.object()
          .keys({
            code: Joi.string().required(),
            number: Joi.string().required(),
          })
          .required(),
      })
      .required(),
  }),
  async function loginInteraction(req, res) {
    try {
      const {
        otp,
        phone_number: { code, number },
        phone_number,
        token,
        default_lang,
        mobile_type
      } = req.body;
      const decoded = jwt.verify(token, SECRET_KEY);
      const ph_num = phone_number.code + phone_number.number;
      if (decoded.phone_number != ph_num) {
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

      const customer = await Customer.findOne({
        "phone_number.number": number,
        "phone_number.code": code,
        deleted_at: {
          $exists: false,
        },
      });
      if (!customer) {
        const data = {
          is_registered: false,
          terms_and_conditions: false,
        };
        return response.send(
          1,
          STATUS_CODE.OK,
          `OTP verified`,
          data,
          res,
          null
        );
      } else {
        if (customer.phone_number_verified_at == null) {
          customer.phone_number_verified_at = Date.now();
          await customer.save();
        }
        if (default_lang) {
          customer.default_language = default_lang;
          await customer.save();
        }
        const membershipClaims = await MembershipClaim.updateMany(
          {
            customer_id: customer.id,
            status: MINTING_STATUS.PENDING_VERIFICATION,
          },
          {
            $set: {
              status: MINTING_STATUS.PENDING,
            },
          }
        );
        const user_id = customer._id;

        const access_token = jwt.sign({ user_id, mobile_type }, SECRET_KEY, {
          expiresIn: "7d",
        });
        const refresh_token = jwt.sign({ user_id }, SECRET_KEY, {
          expiresIn: "30d",
        });

        const data = {
          customer,
          token: {
            access_token: access_token,
            refresh_token: refresh_token,
          },
          is_registered: true,
          terms_and_conditions: customer.terms_and_conditions_consent,
        };

        // check session
        const userAgentInfo = extractUserAgentData(req);
        const session = await UserSession.findOne({
          deviceId: userAgentInfo.deviceId,
          user: user_id,
        });
        if (session && session.status === USER_SESSION_STATUS.BANNED) {
          return response.send(
            0,
            STATUS_CODE.UNAUTHORIZED,
            `failed to log in`,
            null,
            res,
            ERROR.UNAUTHORIZED
          );
        }

        // create/update user session
        await UserSession.findOneAndUpdate(
          {
            deviceId: userAgentInfo.deviceId,
            user: user_id,
          },
          {
            ...userAgentInfo,
            user: user_id,
            last_active: Date.now(),
            status: USER_SESSION_STATUS.ACTIVE,
          },
          {
            upsert: true,
          }
        );
        return response.send(
          1,
          STATUS_CODE.OK,
          `Login interaction Confirmed`,
          data,
          res,
          null
        );
      }
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while verifying OTP: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/auth/interaction/confirm",
        HTTP_VERBS.POST,
        null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't verify otp",
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
 * /v1/auth/interaction/confirm:
 *   post:
 *     tags: [Authentication]
 *     summary: Confirm login interaction
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *               phone_number:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   number:
 *                     type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login interaction confirmed
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
 *                   example: Login interaction confirmed
 *                 data:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       $ref: '#/components/schemas/Customer'
 *                     token:
 *                       type: object
 *                       properties:
 *                         access_token:
 *                           type: string
 *                         refresh_token:
 *                           type: string
 *       401:
 *         description: No auth-token with this phone number
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
 *                   example: No auth-token with this phone number
 *       403:
 *         description: OTP expired or invalid
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
*/