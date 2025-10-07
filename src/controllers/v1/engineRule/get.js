"use strict";

const { CartRule, SystemLocalization } = require("@src/models");
const { verifyAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const moment = require("moment");
const { custom } = require("joi");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getAllEngineRulesV1Controller(req, res) {
    try {
      const { customer, default_language } = req;

      const today = new Date();
      let engineRules = await CartRule.find({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        is_published: true,
        "conditions.end_date": { $gte: today },
        // "conditions.merchants": { $size: 0 },
      }).sort({ created_at: "desc" });

      if (customer.default_language == default_language) {
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
      }
      else {
        engineRules = await Promise.all(
          engineRules.map(async (rule) => {
            const [sysName, shortDesc, desc] = await Promise.all([
              SystemLocalization.findOne({
                eid: rule._id.toString(),
                key: `${rule._id}_engineRule_name`,
                lang_id: customer.default_language,
              }),
              SystemLocalization.findOne({
                eid: rule._id.toString(),
                key: `${rule._id}_engineRule_short_description`,
                lang_id: customer.default_language,
              }),
              SystemLocalization.findOne({
                eid: rule._id.toString(),
                key: `${rule._id}_engineRule_description`,
                lang_id: customer.default_language,
              }),
            ]);

            return {
              ...rule._doc,
              name: sysName?.value || rule.name,
              short_description: shortDesc?.value || rule.short_description,
              description: desc?.value || rule.description,
              conditions: {
                ...rule.conditions,
                formatted_date: moment(rule.conditions.end_date).format("DD MMMM, YYYY"),
              },
            };
          })
        );

      }

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
        `Exception while fetching engine rules: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/engine-rules/get-all",
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
 * /v1/engine-rule/get-all:
 *   get:
 *     tags: [EngineRule]
 *     summary: Get all engine rules
 *     description: Retrieve a list of all engine rules. If the customer's language differs from the default language, localized titles and descriptions will be provided.
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
