"use strict";

const { SlotMachineGame } = require("@src/models");
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
  async function getSlotMachineDataV1Controller(req, res) {
    try {
      const query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };

      const data = await SlotMachineGame.find(query)
        .sort({ display_order: 1 })
        .lean();
      const wheel_1_points = getRandomWheelPoints(
        data.map((item) => ({ ...item, probability: item.probability_wheel_1 }))
      );
      console.log({ wheel_1_points });
      const wheel_1_index = data.findIndex((i) => i.points === wheel_1_points);
      const wheel_2_points = getRandomWheelPoints(
        data.map((item) => ({ ...item, probability: item.probability_wheel_2 }))
      );
      const wheel_2_index = data.findIndex((i) => i.points === wheel_2_points);
      const wheel_3_points = getRandomWheelPoints(
        data.map((item) => ({ ...item, probability: item.probability_wheel_3 }))
      );
      const wheel_3_index = data.findIndex((i) => i.points === wheel_3_points);

      let points = 0;
      if (
        wheel_1_points === wheel_2_points &&
        wheel_2_points === wheel_3_points
      ) {
        points = wheel_1_points * 5;
      } else {
        points = wheel_1_points + wheel_2_points + wheel_3_points;
      }

      const result = {
        index: `${wheel_1_index}${wheel_2_index}${wheel_3_index}`,
        points,
      };

      const options = data.map((item) => item.symbol);

      return response.send(
        1,
        STATUS_CODE.OK,
        "Slot Machine",
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
        `Exception while fetching slot machine data: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/gamification/slot-machine`,
        HTTP_VERBS.GET,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't fetch slot machine data",
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
 * /v1/gamification/slot-machine:
 *   get:
 *     tags: [Gamification]
 *     summary: Get all Slot Machine data
 *     responses:
 *       '200':
 *         description: List of Slot Machine data along with the result of a spin
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
 *                   example: "Slot Machine"
 *                 data:
 *                   type: object
 *                   properties:
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: "🥩"
 *                       description: List of available options with symbol and points for the slot machine
 *                     result:
 *                       type: object
 *                       properties:
 *                         index:
 *                           type: string
 *                           example: "012"
 *                           description: A concatenated string of indices for the selected points from the wheels
 *                         points:
 *                           type: number
 *                           example: 50
 *                           description: The total points calculated based on the selected wheel points
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
 *                   example: "Couldn't fetch slot machine data"
 *                 data:
 *                   type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Detailed error message here"
 */
