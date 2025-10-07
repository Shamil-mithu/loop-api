"use strict";

const { Ticket } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const moment = require("moment");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    params: Joi.object().keys({
      ticketId: Joi.string().required(),
    }),
  }),
  async function getAllTicketV1Controller(req, res) {
    try {
      const {
        customer,
        params: { ticketId },
      } = req;
      const ticket = await Ticket.findOne({
        user_id: customer.id,
        _id: ticketId,
      }).populate("user_id", "name + profile_pic + phone_number");
      const formattedTicket = {
        ...ticket._doc,
        created_at: moment(ticket.created_at).format("MM/DD/YYYY hh:mm A"),
      };
      return response.send(
        1,
        STATUS_CODE.OK,
        "ticket",
        formattedTicket,
        res,
        null
      );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching ticket: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/ticket/${req?.params?.ticketId}`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch ticket",
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
 * /v1/ticket/{ticketId}:
 *   get:
 *     tags: [Ticket]
 *     summary: Get a ticket for the authenticated customer by ticketId
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         description: ID of the ticket to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: A single ticket object
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
 *                   example: Ticket fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 60d5ec49f892d61180b5c9d4
 *                     user_id:
 *                       type: string
 *                       example: 60d5ec49f892d61180b5c9d4
 *                     support_type:
 *                       type: string
 *                       example: Technical
 *                     ticket_status:
 *                       type: string
 *                       example: Open
 *                     title:
 *                       type: string
 *                       example: Cannot access my account
 *                     description:
 *                       type: string
 *                       example: I have been unable to access my account for the past week.
 *                     attachment:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: ["https://s3.amazonaws.com/bucket/file1.png", "https://s3.amazonaws.com/bucket/file2.png"]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-05-21T15:23:42.389Z
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-05-21T15:23:42.389Z
 *       '404':
 *         description: Ticket not found
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
 *                   example: Ticket not found
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
 *                   example: Could not fetch ticket
 */
