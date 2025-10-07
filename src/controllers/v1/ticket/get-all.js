"use strict";

const moment = require('moment');
const { verifyAuth, } = require('@src/middlewares');
const { Ticket } = require("@src/models");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getAllTicketV1Controller(req, res) {
    try {
      const { customer } = req;
      const tickets = await Ticket.find({ user_id: customer.id });

      // Format the created_at date for each ticket
      const formattedTickets = tickets.map((ticket) => {
        return {
          ...ticket._doc,
          created_at: moment(ticket.created_at).format("MM/DD/YYYY"),
          time: moment(ticket.created_at).format("hh:mm A"),
        };
      });

      return response.send(
        1,
        STATUS_CODE.OK,
        "ticket",
        formattedTickets,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching tickets list : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/ticket/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch tickets list",
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
 * /v1/ticket/get-all:
 *   get:
 *     tags: [Ticket]
 *     summary: Get all tickets for the authenticated customer
 *     responses:
 *       '200':
 *         description: List of tickets
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
 *                   example: Tickets fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 60d5ec49f892d61180b5c9d4
 *                       user_id:
 *                         type: string
 *                         example: 60d5ec49f892d61180b5c9d4
 *                       support_type:
 *                         type: string
 *                         example: Technical
 *                       ticket_status:
 *                         type: string
 *                         example: Open
 *                       title:
 *                         type: string
 *                         example: Cannot access my account
 *                       description:
 *                         type: string
 *                         example: I have been unable to access my account for the past week.
 *                       attachment:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["https://s3.amazonaws.com/bucket/file1.png", "https://s3.amazonaws.com/bucket/file2.png"]
 *                       created_at:
 *                         type: string
 *                         format: date
 *                         example: "05/21/2023"
 *                       time:
 *                         type: string
 *                         format: time
 *                         example: "03:23 PM"
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
 *                   example: Could not fetch tickets
 */
