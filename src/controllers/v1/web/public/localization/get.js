"use strict";

const { verifyAuth, validate } = require("@src/middlewares");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const { Localization } = require("@src/models");
const {
  STATUS_CODE,
  LANGUAGE_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  // verifyAuth(),
  validate({
    query: Joi.object().keys({
      lang_id: Joi.string().optional(),
      key: Joi.string().optional(),
      value: Joi.string().optional(),
    }),
  }),
  async function getAllLocalizationV1Controller(req, res) {
    try {
      let { lang_id, key, value, page, limit } = req.query;
      page = page - 1; // convert to 0-based index
      let query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };

      if (lang_id) {
        query.lang_id = { $all: lang_id };
      }
      if (key) {
        query.key = { $regex: key, $options: "i" };
      }
      if (value) {
        query.value = { $regex: value, $options: "i" };
      }

      const totalDocuments = await Localization.countDocuments(query);
      const localizations = await Localization.find(query).populate(
        "lang_id",
        "code"
      );

      let dynamicResponse = {};
      localizations.forEach((localization) => {
        const langCode = localization.lang_id.code;
        if (!dynamicResponse[langCode]) {
          dynamicResponse[langCode] = {};
        }
        dynamicResponse[langCode][localization.key] = localization.value;
      });
      console.log(dynamicResponse);

      const data = {
        totalDocuments,
        localizations: dynamicResponse,
      };

      return response.send(
        1,
        STATUS_CODE.OK,
        "localizations list",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching localizations : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/localization/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch localizations",
        null,
        res,
        error
      );
    }
  },
];

// ------------------------- Exports ----------------------------

module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Localization
 *   description: APIs for Localization operations
 */

/**
 * @swagger
 * /v1/localization/get-all:
 *   get:
 *     tags: [Localization]
 *     summary: Get all localizations
 *     parameters:
 *       - in: query
 *         name: lang_id
 *         schema:
 *           type: string
 *         description: Filter by language ID
 *       - in: query
 *         name: key
 *         schema:
 *           type: string
 *         description: Filter by localization key
 *       - in: query
 *         name: value
 *         schema:
 *           type: string
 *         description: Filter by localization value
 *     responses:
 *       '200':
 *         description: Successful response containing a list of localizations
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
 *                   example: localizations list
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalDocuments:
 *                       type: integer
 *                       example: 50
 *                     localizations:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                         example: 
 *                           "welcome": "Welcome"
 *                           "goodbye": "Goodbye"
 *       '400':
 *         description: Invalid input
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
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Invalid input
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
 *                 code:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
