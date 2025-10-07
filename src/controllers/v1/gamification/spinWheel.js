"use strict";

const { SpinMachineGame } = require("@src/models");
const { validate, verifyAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { LOG_TYPE, HTTP_VERBS, STATUS_CODE } = require("@src/constants");
const {
  response,
  insertMessageLog,
  getRandomWheelPoints,
} = require("@src/utils");
const { Joi } = require("@root/src/lib");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  // verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({}),
  }),
  async function getSpinMachineDataV1Controller(req, res) {
    try {
      const query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };

      const data = await SpinMachineGame.find(query).sort({ display_order: 1 });
      const options = data.map((item) => item.points);
      const points = getRandomWheelPoints(data);
      const index = options.indexOf(points);

      const result = {
        index,
        points,
      };

      return response.send(
        1,
        STATUS_CODE.OK,
        "Spin Machine",
        {
          options,
          result,
        },
        res,
        null
      );
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching spin machine data: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/gamification/spin-wheel`,
        HTTP_VERBS.GET,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't fetch spin machine data",
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
 *   name: Gamification
 *   description: APIs for gamification operations
 */

/**
 * @swagger
 * /v1/gamification/spin-wheel:
 *   get:
 *     tags: [Gamification]
 *     summary: Get all Spin Machine data
 *     responses:
 *       '200':
 *         description: List of Spin Machine data and result of spin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Spin Machine"
 *                 data:
 *                   type: object
 *                   properties:
 *                     options:
 *                       type: array
 *                       items:
 *                         type: number
 *                         example: 50
 *                       description: List of all available points options from the spin machine
 *                     result:
 *                       type: object
 *                       properties:
 *                         index:
 *                           type: number
 *                           example: 1
 *                           description: The index of the selected point value from the options
 *                         points:
 *                           type: number
 *                           example: 50
 *                           description: The randomly selected points value
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
 *                   example: "Couldn't fetch spin machine data"
 *                 data:
 *                   type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Error details here"
 */
