"use strict";

const { verifyAuth, validate, verifyRolesAccess } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  PERSMISSIONS_TYPES,
  PERMISSION_ACTION_TYPES,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { Brand } = require("@src/models");
const { response } = require("@src/utils");
const { Joi } = require("@src/lib");
const { insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  verifyRolesAccess(
    [PERSMISSIONS_TYPES.MERCHANT_MANAGEMENT],
    [PERMISSION_ACTION_TYPES.READ_ONLY_ACCESS]
  ),
  bodyParser.json(),
  validate({
    params: Joi.object().keys({
      brand_id: Joi.string().required(),
    }),
  }),
  async function getOneBrandV1Controller(req, res) {
    try {
      const { brand_id } = req.params;
      const brand = await Brand.findOne({
        _id: brand_id,
        deleted_at: { $exists: false },
      }).select({ password: 0 });

      const data = {
        brand,
      };
      return response.send(1, STATUS_CODE.OK, "Brand", data, res, null);
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching brand: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/brand/${req.params.brand_id}`,
        HTTP_VERBS.GET,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't fetch brand data",
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
 *   name: Brand
 *   description: APIs for Brand operations
 */

/**
 * @swagger
 * /v1/brand/{brand_id}:
 *   get:
 *     tags: [Brand]
 *     summary: Get a Brand
 *     parameters:
 *       - in: path
 *         name: brand_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the brand 
 *     responses:
 *       '200':
 *         description: Brand details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: Brand data
 *                 data:
 *                   type: object
 *                   properties:
 *                     brand:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: 605c5fdb5f1b2c0017c0f1e9
 *                         name:
 *                           type: string
 *                           example: Example Brand
 *                         email:
 *                           type: string
 *                           example: brand@example.com
 *                         unique_code:
 *                           type: string
 *                           example: 1234567890
 *                         phone_number:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                               example: +92
 *                             number:
 *                               type: string
 *                               example: 1234567
 *                         created_by:
 *                           type: string
 *                           example: 605c5fdb5f1b2c0017c0f1e9
 *       '404':
 *         description: Brand not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: Brand not found
 *                 data:
 *                   type: null
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 data:
 *                   type: null
 */

