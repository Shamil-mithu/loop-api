"use strict";

const { verifyAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  response,
  extractUserAgentData,
  insertMessageLog,
} = require("@src/utils");
const { UserSession, Customer } = require("@src/models");
const {
  LOG_TYPE,
  HTTP_VERBS,
  ERROR,
  STATUS_CODE,
  USER_SESSION_STATUS,
} = require("@src/constants");

//------------------------------------CONTROLLER-------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  async function userLogout(req, res) {
    try {
      const { customer } = req
      // create/update user session
      const userAgentInfo = extractUserAgentData(req);
      await UserSession.findOneAndUpdate(
        {
          deviceId: userAgentInfo.deviceId,
          user: req.customer.id,
        },
        {
          ...userAgentInfo,
          user: req.customer.id,
          last_active: Date.now(),
          status: USER_SESSION_STATUS.UN_ACTIVE,
        },
        {
          upsert: true,
        }
      );
      customer.device_token = null
      await customer.save()


      return response.send(1, STATUS_CODE.OK, "Logged out", null, res, null);
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception at logout: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/auth/interaction/logout`,
        HTTP_VERBS.GET,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "failed to logout",
        null,
        res,
        error
      );
    }
  },
];

module.exports = CONTROLLER;
/**
 * @swagger
 * /v1/auth/interaction/logout:
 *   get:
 *     tags: [Authentication]
 *     summary: User logout
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: logged out
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
 *                   example: logged out Successfully
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - Invalid Credentials
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
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Invalid Credentials
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
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
 *                   example: Internal Server Error
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   example: null
 */
