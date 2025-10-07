"use strict";

const {
  Customer,
  SystemLocalization,
  Currency,
  CryptoCurrency,
} = require("@src/models");
const { Joi, S3 } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  RESPONSE_ACTION,
  LOG_TYPE,
  HTTP_VERBS,
  CURRENCY_KIND,
} = require("@src/constants");
const {
  response,
  getFileInfoFromBase64: { getFileInfoFromBase64 },
  insertMessageLog,
} = require("@src/utils");
const { Apple } = require('@src/services');

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object()
      .keys({
        default_currency: Joi.string().optional(),
        currency_type: Joi.string()
          .valid(...Object.keys(CURRENCY_KIND))
          .optional(),
      })
      .required(),
  }),
  async function updateUserDefaultCurrencyV1(req, res) {
    try {
      const {
        customer,
        body: { default_currency, currency_type },
      } = req;

      const updatedCustomer = await Customer.findOneAndUpdate(
        {
          _id: customer.id,
        },
        {
          default_currency,
          currency_type,
        },
        {
          new: true,
        }
      );

      const sys_localization = await SystemLocalization.findOne({
        eid: customer.default_language,
        key: `${customer.default_language}_response_${RESPONSE_ACTION.DEFAULT_CURRENCY_UPDATED}`,
        lang_id: customer.default_language,
      });
      const responseMessage =
        customer.default_language == req.default_language || !sys_localization
          ? "currency updated"
          : sys_localization.value;

      if (updatedCustomer && updatedCustomer?.apple_pass_push_token) {
        Apple.sendPassUpdateNotification(customer?.apple_pass_push_token, req)
      }
      return response.send(
        1,
        STATUS_CODE.OK,
        responseMessage,
        updatedCustomer,
        res,
        null
      );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating customer default currency : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer/default-currency",
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't update currency",
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
 *   name: Customer
 *   description: APIs for customer operations
 */

/**
 * @swagger
 * /v1/customer/default-currency:
 *   put:
 *     tags: [Customer]
 *     summary: Update customer profile
 *     description: Update customer profile information such as name, gender, date of birth, profile picture, and email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               default_currency:
 *                 type: string
 *                 description: the id of the currency
 *               currency_type:
 *                 type: string
 *                 description: currecny type
 *                 enum:
 *                   - FIAT
 *                   - CRYPTO
 *     responses:
 *       '200':
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Customer ID
 *                     email:
 *                       type: string
 *                       description: Customer's email address
 *                     name:
 *                       type: string
 *                       description: Customer's name
 *                     gender:
 *                       type: string
 *                       description: Customer's gender
 *                       enum:
 *                         - male
 *                         - female
 *                         - other
 *                     date_of_birth:
 *                       type: object
 *                       description: Customer's date of birth
 *                       properties:
 *                         date:
 *                           type: integer
 *                           description: Day of the month
 *                         month:
 *                           type: integer
 *                           description: Month
 *                         year:
 *                           type: integer
 *                           description: Year
 *                     profile_pic:
 *                       type: string
 *                       description: URL of the customer's profile picture
 *                     default_currency:
 *                       type: string
 *                     currecny_type:
 *                       type: string
 *                     email_verified_at:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp when the email was verified
 *                     phone_number:
 *                       type: object
 *                       properties:
 *                         code:
 *                           type: string
 *                           description: Country code
 *                         number:
 *                           type: string
 *                           description: Phone number
 *                     phone_number_verified_at:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp when the phone number was verified
 *                     twoFA_enabled:
 *                       type: boolean
 *                       description: Whether two-factor authentication is enabled
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of profile creation
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the last profile update
 *       '400':
 *         description: Bad Request - Validation Error
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
 *                   example: Invalid input data
 *       '500':
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
