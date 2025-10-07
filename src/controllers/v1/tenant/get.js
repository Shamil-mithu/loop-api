"use strict";

const { verifyAuth, validate, verifyRolesAccess } = require("@src/middlewares");
const { response } = require("@src/utils");
const { Joi } = require("@src/lib");
const { Brand } = require("@src/models");
const {
  STATUS_CODE,
  PERSMISSIONS_TYPES,
  PERMISSION_ACTION_TYPES,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { insertMessageLog } = require("@src/utils");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  verifyAuth(),
  verifyRolesAccess(
    [PERSMISSIONS_TYPES.MERCHANT_MANAGEMENT],
    [PERMISSION_ACTION_TYPES.READ_ONLY_ACCESS]
  ),
  validate({
    query: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
  }),
  async function getAllBrandV1Controller(req, res) {
    try {
      let { limit, page } = req.query;
      page = page - 1;

      const query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };

      const brands = await Brand.find(query)
        .limit(limit)
        .skip(page * limit)
        .select({ password: 0 })
        .populate("created_by", "name");

      const totalDocuments = await Brand.countDocuments(query);
      const page_count = +Math.ceil(totalDocuments / limit);
      const meta = {
        total_documents: totalDocuments,
        page: page + 1,
        limit,
        page_count,
      };

      const data = {
        meta,
        brands,
      };

      return response.send(1, STATUS_CODE.OK, "Brands List", data, res, null);
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching brands: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/brand/get-all",
        HTTP_VERBS.GET,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't fetch brands",
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
 *   name: Brand
 *   description: APIs for Brand operations
 */

/**
 * @swagger
 * /v1/brand/get-all:
 *   get:
 *     tags: [Brand]
 *     summary: Get all brands
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         required: false
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         required: false
 *         description: Number of records per page
 *     responses:
 *       '200':
 *         description: List of brands
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total_document:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     page_count:
 *                       type: integer
 *                       example: 10
 *                 brands:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 605c5fdb5f1b2c0017c0f1e9
 *                       name:
 *                         type: string
 *                         example: John Doe
 *                       email:
 *                         type: string
 *                         example: johndoe@example.com
 *                       unique_code:
 *                         type: string
 *                         example: 1234567890
 *                       phone_number:
 *                         type: object
 *                         properties:
 *                              code:
 *                                type: string
 *                                example: +92
 *                              number:
 *                                type: string
 *                                example: 1234567
 *                       created_by:
 *                         type: object
 *                         properties:
 *                              id:
 *                                  type: string
 *                                  example: 60c72b2f9f1b2c001c8e4f0a
 *                              name:
 *                                  type: string
 *                                  example: john
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
 *                   example: Could not fetch brands
 */

