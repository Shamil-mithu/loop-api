"use strict";

const { CartRule } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const { Types } = require("mongoose");
const moment = require("moment");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    params: Joi.object().keys({
      merchantId: Joi.string().required(),
    }),
  }),
  async function getAllEngineRulesV1Controller(req, res) {
    const { customer } = req;
    const { merchantId } = req.params;

    try {
      const today = new Date();

      let engineRules = await CartRule.find({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        is_published: true,
        "conditions.end_date": { $gte: today },
        $or: [
          { "conditions.merchants": { $size: 0 } },
          { "conditions.merchants": { $in: [new Types.ObjectId(merchantId)] } },
        ],
      }).sort({ created_at: "asc" });

      engineRules = engineRules.map((rule) => {
        let temp_rule = {
          ...rule._doc,
          conditions: {
            ...rule.conditions,
            formatted_date: moment(rule.conditions.end_date).format(
              "DD MMMM, 2024"
            ),
          },
        };
        return temp_rule;
      });

      return response.send(
        1,
        STATUS_CODE.OK,
        "engine rules",
        engineRules,
        res,
        null
      );
    } catch (error) {
      console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching merchant engine rules: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/engine-rules/merchant/${req.params.merchantId}`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch engine rules",
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
 *   name: EngineRule
 *   description: APIs for EngineRule operations
 */

/**
 * @swagger
 * /v1/engine-rule/merchant/{merchantId}:
 *   get:
 *     tags: [EngineRule]
 *     summary: Get engine rules for specific merchant
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the merchant to retrieve engine rules
 *     responses:
 *       '200':
 *         description: A list of engine rules successfully retrieved
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
 *                   example: engine rules
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60c72b2f9b1d4f4f5c8f16bc"
 *                       title:
 *                         type: string
 *                         example: What is your return policy?
 *                       description:
 *                         type: string
 *                         example: You can return any item within 30 days of purchase if it's in its original condition.
 *                       status:
 *                         type: string
 *                         example: active
 *                       display_order:
 *                         type: integer
 *                         example: 1
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
 *                   example: Could not fetch engine rules
 */
