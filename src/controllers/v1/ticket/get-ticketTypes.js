"use strict";

const { Ticket } = require("@src/models");
const { verifyAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  TICKET_SUPPORT_TYPES,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getAllTicketV1Controller(req, res) {
    try {
      // const { customer } = req; // Customer object not used
      return response.send(
        1,
        STATUS_CODE.OK,
        "ticket",
        Object.values(TICKET_SUPPORT_TYPES),
        res,
        null
      );
    } catch (error) {
      console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching tickets types : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/ticket/types/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch tickets types",
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
 *   name: Ticket
 *   description: APIs for Ticket operations
 */

/**
 * @swagger
 * /v1/ticket/types/get-all:
 *   get:
 *     tags: [Ticket]
 *     summary: Get all ticket support types
 *     responses:
 *       '200':
 *         description: List of ticket support types
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
 *                   example: ticket
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example:
 *                     - Technical Related
 *                     - Software Bug
 *                     - Hardware Malfunction
 *                     - Network Connectivity Issue
 *                     - Configuration Error
 *                     - Performance Bottleneck
 *                 errors:
 *                   type: object
 *                   nullable: true
 *                   example: null
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
 *                   example: Could not fetch ticket support types
 *                 data:
 *                   type: array
 *                   nullable: true
 *                   example: null
 *                 errors:
 *                   type: string
 *                   example: Internal server error
 */
