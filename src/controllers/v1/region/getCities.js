"use strict";

const { City } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { Joi } = require('@src/lib');
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  // verifyAuth(), // Uncomment if authentication is required
  bodyParser.json(),
  validate({
    body: Joi.object()
      .keys({
        country_code: Joi.string().required(),
        state_code: Joi.string().required(),
      })
      .required(),
    query: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
  }),
  async function getAllCitiesV1Controller(req, res) {
    try {
      let { page, limit } = req.query;
      const { country_code, state_code } = req.body;
      page = page - 1;

      // Calculate pagination
      const cities = await City.find({ country_code, state_code })
        .limit(limit)
        .skip(page * limit); // Corrected page calculation

      const totalDocuments = await City.countDocuments({
        country_code,
        state_code,
      });
      const page_count = Math.ceil(totalDocuments / limit);

      const meta = {
        page: page + 1,
        totalDocuments,
        limit,
        page_count,
      };

      const data = {
        cities,
        meta,
      };
      return response.send(
        1,
        STATUS_CODE.OK,
        "Cities retrieved successfully",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching cities : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/region/city/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Could not fetch cities",
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
 *   name: Region
 *   description: APIs for Region operations
 */

/**
 * @swagger
 * /v1/region/city/get-all:
 *   post:
 *     tags: [Region]
 *     summary: Get all cities
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country_code:
 *                 type: string
 *                 example: US
 *               state_code:
 *                 type: string
 *                 example: CA
 *     responses:
 *       '200':
 *         description: List of cities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Cities retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     cities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: Los Angeles
 *                           code:
 *                             type: string
 *                             example: LA
 *                           country:
 *                             type: string
 *                             example: USA
 *                           state:
 *                             type: string
 *                             example: California
 *                     meta:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         totalDocuments:
 *                           type: integer
 *                           example: 100
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         page_count:
 *                           type: integer
 *                           example: 10
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
 *                 status_code:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Could not fetch cities
 *                 error:
 *                   type: string
 *                   example: Error details here
 */
