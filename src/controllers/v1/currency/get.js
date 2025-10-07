"use strict";

const { verifyAuth, validate, verifyRolesAccess } = require("@src/middlewares");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const { Currency, CryptoCurrency } = require("@src/models");
const {
  LOG_TYPE,
  HTTP_VERBS,
  STATUS_CODE,
  CURRENCY_KIND,
} = require("@src/constants");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  verifyAuth(),
  validate({
    query: Joi.object().keys({
      type: Joi.string()
        .valid(...Object.values(CURRENCY_KIND), "")
        .optional(),
    }),
  }),
  async function getAllCurrenciesV1Controller(req, res) {
    try {
      let { type } = req.query;

      const query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };

      if (type) {
        query.type = type;
      }

      const [fiat, crypto] = await Promise.all([
        Currency.find(query),
        CryptoCurrency.find(query),
      ]);

      const fiatTotalDocuments = await Currency.countDocuments(query);
      const cryptoTotalDocuments = await CryptoCurrency.countDocuments(query);

      return response.send(
        1,
        STATUS_CODE.OK,
        "Currencies List",
        {
          fiat: {
            currencies: fiat,
            total_documents: fiatTotalDocuments,
          },
          crypto: {
            currencies: crypto,
            total_documents: cryptoTotalDocuments,
          },
        },
        res
      );
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching currencies: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/currency/get-all${
          req.query.type ? "?type=" + req.query.type : ""
        }`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch currencies",
        null,
        res,
        error
      );
    }
  },
];

// ------------------------- Exports ----------------------------

module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Currency
 *   description: APIs for currency operations
 */

/**
 * @swagger
 * /v1/currency/get-all:
 *   get:
 *     tags: [Currency]
 *     summary: Get a list of all currencies
 *     description: Retrieve a list of all currencies, filtered by type if provided (either FIAT or CRYPTO).
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum:
 *             - ""
 *             - "FIAT"
 *             - "CRYPTO"
 *         description: The type of the currency. Can be FIAT, CRYPTO, or empty for all types.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of currencies.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Currencies List
 *                 data:
 *                   type: object
 *                   properties:
 *                     fiat:
 *                       type: object
 *                       properties:
 *                         total_documents:
 *                           type: integer
 *                           example: 100
 *                         currencies:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: 60c72b2f9f1b2c001c8e4f0a
 *                               name:
 *                                 type: string
 *                                 example: USD
 *                               code:
 *                                 type: string
 *                                 example: USD
 *                               point_rate:
 *                                 type: number
 *                                 example: 1.5
 *                               type:
 *                                 type: string
 *                                 example: FIAT
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: 2024-06-13T12:34:56.789Z
 *                               updatedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: 2024-06-13T12:34:56.789Z
 *                               deletedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                                 example: null
 *                               createdBy:
 *                                 type: string
 *                                 example: admin
 *                     crypto:
 *                       type: object
 *                       properties:
 *                         total_documents:
 *                           type: integer
 *                           example: 100
 *                         currencies:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: 60c72b2f9f1b2c001c8e4f0a
 *                               name:
 *                                 type: string
 *                                 example: Bitcoin
 *                               code:
 *                                 type: string
 *                                 example: BTC
 *                               point_rate:
 *                                 type: number
 *                                 example: 1.5
 *                               type:
 *                                 type: string
 *                                 example: CRYPTO
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: 2024-06-13T12:34:56.789Z
 *                               updatedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 example: 2024-06-13T12:34:56.789Z
 *                               deletedAt:
 *                                 type: string
 *                                 format: date-time
 *                                 nullable: true
 *                                 example: null
 *                               createdBy:
 *                                 type: string
 *                                 example: admin
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 code:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Invalid pagination parameters
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 code:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
