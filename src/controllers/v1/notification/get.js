"use strict";

const { Notification } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
  }),
  async function getAllNotificationV1Controller(req, res) {
    const { customer } = req;
    let { page, limit } = req.body;
    page = page - 1;
    try {
      let notifications = await Notification.find({
        customer_id: customer.id,
      })
        .limit(limit)
        .skip(page * limit)
        .select({ _id: 0 })
        .sort({ created_at: -1 });
      let totalNotifications = await Notification.countDocuments({
        customer_id: customer.id,
      });

      notifications = notifications.map((noti) => {
        return {
          title: noti.title,
          description: noti.description,
          status: noti.status,
          type: noti.type,
          customer_id: noti.customer_id,
          entity_type: noti.entity_type,
          entity_id: noti.entity_id,
          created_at: noti.created_at.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        };
      });
      const page_count = +Math.ceil(totalNotifications / limit);
      const data = {
        notifications,
        meta: {
          total_document: totalNotifications,
          page: page + 1,
          limit,
          page_count,
        },
      };
      return response.send(1, STATUS_CODE.OK, "notification", data, res, null);
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching notifications: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/notification/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch notifications",
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
 *   name: Notification
 *   description: APIs for notification operations
 */

/**
 * @swagger
 * /v1/notification/get-all:
 *   post:
 *     tags: [Notification]
 *     summary: Retrieve a paginated list of notifications for a customer
 *     description: This endpoint returns notifications based on the provided pagination parameters. 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: The page number for pagination (starting from 1).
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 default: 10
 *                 description: The number of notifications to retrieve per page.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of notifications
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
 *                   example: Notifications retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                             example: Purchase through merchant
 *                           description:
 *                             type: string
 *                             example: Thank you for ordering with Mithu.
 *                           status:
 *                             type: string
 *                             example: unread
 *                           type:
 *                             type: string
 *                             example: individual
 *                           customer_id:
 *                             type: string
 *                             example: 66502dd916a75f8353b617a0
 *                           entity_type:
 *                             type: string
 *                             example: order
 *                           entity_id:
 *                             type: string
 *                             example: 665436c161ec117715786edd
 *                     meta:
 *                       type: object
 *                       properties:
 *                         total_document:
 *                           type: integer
 *                           example: 100
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         page_count:
 *                           type: integer
 *                           example: 10
 *       '400':
 *         description: Bad request due to invalid parameters
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
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Invalid request parameters
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
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: Error details here
 */
