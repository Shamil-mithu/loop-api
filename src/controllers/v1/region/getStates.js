"use strict";

const { State } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { Joi } = require('@src/lib');
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      country_code: Joi.string().required(),
    }),
    query: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
  }),
  async function getAllStateV1Controller(req, res) {
    try {
      let { page, limit } = req.query; // Use destructuring with defaults
      const { country_code } = req.body;
      page = page - 1; // Adjust for pagination

      const states = await State.find({ country_code })
        .limit(limit)
        .skip(page * limit);

      const totalDocuments = await State.countDocuments({ country_code });
      const page_count = Math.ceil(totalDocuments / limit);

      const meta = {
        page: page + 1,
        totalDocuments,
        limit,
        page_count,
      };
      const data = {
        states,
        meta,
      };
      return response.send(
        1,
        STATUS_CODE.OK,
        "States retrieved successfully",
        data,
        res,
        null
      );
    } catch (error) {
      console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching states : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/region/state/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Could not fetch states",
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
 *   description: APIs for State operations
 */

/**
 * @swagger
 * /v1/region/state/get-all:
 *   post:
 *     tags: [Region]
 *     summary: Get all states for a specific country
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
 *         description: List of states for the specified country
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
 *                   example: States retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     states:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: California
 *                           code:
 *                             type: string
 *                             example: CA
 *                           country:
 *                             type: string
 *                             example: USA
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
 *                   example: Could not fetch states
 *                 error:
 *                   type: string
 *                   example: Error details here
 */
