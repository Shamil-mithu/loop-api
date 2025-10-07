"use strict";

const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const {
  Customer,
  CustomerType,
  Language,
  Currency,
  UserSession,
} = require("@src/models");
const bodyParser = require("body-parser");
const { authenticator } = require("otplib");
const {
  response,
  extractUserAgentData,
  insertMessageLog,
} = require("@src/utils");
const {
  ERROR,
  STATUS_CODE,
  CUSTOMER_GENDER,
  CUSTOMER_TYPES,
  USER_SESSION_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
  CURRENCY_KIND,
} = require("@src/constants");
const jwt = require("jsonwebtoken");
const { generateUniqueReferralCode } = require("@src/utils");
const SECRET_KEY = process.env.JWT_AUTH_SECRET;

const CONTROLLER = [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  validate({
    body: Joi.object()
      .keys({
        default_lang: Joi.string().optional(),
        mobile_type: Joi.string().optional(),
        default_currency: Joi.string().optional(),
        currency_type: Joi.string()
          .valid(...Object.keys(CURRENCY_KIND))
          .optional(),
        email: Joi.string().email().allow(""),
        country_code: Joi.string(),
        gender: Joi.string()
          .valid(...Object.keys(CUSTOMER_GENDER))
          .optional(),
        date_of_birth: Joi.object()
          .keys({
            date: Joi.number().integer().allow(null).min(1).max(31).optional(),
            month: Joi.number().integer().allow(null).min(1).max(12).optional(),
            year: Joi.number()
              .integer()
              .allow(null)
              .min(new Date().getFullYear() - 100)
              .max(new Date().getFullYear())
              .optional(),
          })
          .optional(),
        phone_number: Joi.object()
          .keys({
            code: Joi.string().required(),
            number: Joi.string().required(),
          })
          .required(),
        name: Joi.string().required(),
        referred_code: Joi.string().allow(""),
      })
      .required(),
  }),
  async function registerInteraction(req, res) {
    try {
      const {
        email,
        phone_number,
        gender,
        name,
        date_of_birth,
        referred_code,
        default_lang,
        default_currency,
        currency_type,
        mobile_type
      } = req.body;
      const secret = authenticator.generateSecret();
      const userExists = await Customer.countDocuments({
        phone_number,
        deleted_at: { $exists: false },
      });
      if (userExists > 0) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          `Customer already exist`,
          null,
          res,
          ERROR.CUSTOMER_ALREADY_EXIST
        );
      }
      const customer_type = await CustomerType.findOne({
        name: CUSTOMER_TYPES.BASIC,
      });
      if (!customer_type) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          "Registration Failed",
          null,
          res,
          null
        );
      }
      let referral_code = await generateUniqueReferralCode();

      if (referred_code?.length > 0) {
        const referred_customer = await Customer.findOne({
          referral_code: referred_code,
        });
        if (!referred_customer) {
          return response.send(
            0,
            STATUS_CODE.NOT_FOUND,
            "Invalid referral code",
            null,
            res,
            null
          );
        }
      }
      const defaultLang = await Language.findOne({
        code: "en",
      });
      if (!defaultLang) {
        return response.send(
          0,
          STATUS_CODE.FAILED_DEPENDENCY,
          "English could not be set as default Language",
          null,
          res,
          null
        );
      }
      const defaultCurrency = await Currency.findOne({
        code: "SAR",
      });

      const newUser = await Customer.create({
        email: email?.length > 0 ? email : null,
        phone_number,
        gender,
        name,
        date_of_birth,
        secret: secret,
        customer_type: customer_type._id,
        email_verified_at: email?.length > 0 ? Date.now() : null,
        referred_code: referred_code ?? null,
        referral_code: referral_code,
        phone_number_verified_at: Date.now(),
        default_language: default_lang ?? defaultLang._id,
        default_currency: default_currency ?? defaultCurrency?._id,
        currency_type: currency_type ?? defaultCurrency?.type,
      });
      if (!newUser) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          "Registration Failed",
          null,
          res,
          null
        );
      }
      const user_id = newUser._id;
      const access_token = jwt.sign({ user_id, mobile_type }, SECRET_KEY, {
        expiresIn: "1d",
      });
      const refresh_token = jwt.sign({ user_id }, SECRET_KEY, {
        expiresIn: "30d",
      });
      const customer = {
        email: newUser.email,
        phone_number: newUser.phone_number,
        gender: newUser.gender,
        name: newUser.name,
        date_of_birth: newUser.date_of_birth,
        email_verified_at: newUser.email_verified_at,
        referred_code: newUser.referred_code,
        referral_code: newUser.referral_code,
        customer_type_name: customer_type.name,
        default_language: defaultLang.name,
        default_currency: newUser.default_currency,
        currency_type: newUser.currency_type,
        phone_number_verified_at: newUser.phone_number_verified_at,
        is_earned_gaming_points: newUser.is_earned_gaming_points,
      };
      const data = {
        customer,
        token: {
          access_token: access_token,
          refresh_token: refresh_token,
        },
        is_registered: true,
        terms_and_conditions: customer.terms_and_conditions_consent,
      };

      // create/update user session
      const userAgentInfo = extractUserAgentData(req);
      UserSession.create({
        ...userAgentInfo,
        user: user_id,
        last_active: Date.now(),
        status: USER_SESSION_STATUS.ACTIVE,
      });

      return response.send(
        1,
        STATUS_CODE.OK,
        "Registration Successfull",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while registration: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/auth/interaction/register",
        HTTP_VERBS.POST,
        null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't register",
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
 * /v1/auth/interaction/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new customer
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
 *               country_code:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               date_of_birth:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: integer
 *                   month:
 *                     type: integer
 *                   year:
 *                     type: integer
 *               phone_number:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   number:
 *                     type: string
 *               name:
 *                 type: string
 *               referred_code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer registered successfully
 *       409:
 *         description: Customer already exists
 */