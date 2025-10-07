"use strict";

const { optionalAuth, validate } = require("@src/middlewares");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const { Language, SystemLocalization } = require("@src/models");
const {
  STATUS_CODE,
  LANGUAGE_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  optionalAuth(),
  validate({
    query: Joi.object().keys({
      lang_id: Joi.string().optional(),
      name: Joi.string().optional(),
      code: Joi.string().optional(),
      isRTL: Joi.bool().optional(),
      locale: Joi.string().optional(),
      status: Joi.string().valid(...Object.values(LANGUAGE_STATUS)),
    }),
  }),
  async function getAllLanguagesV1Controller(req, res) {
    try {
      const { customer } = req;

      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      let { lang_id, name, code, isRTL, locale, status } = req.query;
      let query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };

      if (lang_id) {
        query.lang_id = { $all: lang_id };
      }
      if (name) {
        query.name = { $regex: name, $options: "i" };
      }
      if (code) {
        query.code = { $regex: code, $options: "i" };
      }
      if (isRTL) {
        query.isRTL = { $all: isRTL };
      }
      if (status) {
        query.status = { $all: status };
      }
      if (locale) {
        query.locale = { $regex: locale, $options: "i" };
      }

      const languages = await Language.find(query);
      let data = {
        languages,
      };

      if (!customer) {
        return response.send(1, STATUS_CODE.OK, "languages", data, res, null);
      }

      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();

      if (customerLangId === defaultLangId) {
        return response.send(
          1,
          STATUS_CODE.OK,
          "Languages list",
          data,
          res,
          null
        );
      }

      const localizedLanguages = await Promise.all(
        languages.map(async (lang) => {
          const sysName = await SystemLocalization.findOne({
            eid: lang._id.toString(),
            key: `${lang._id}_language_name`,
            lang_id: customer.default_language,
          });

          if (sysName) {
            lang.name = sysName?.value ?? lang.name;

            return lang;
          }
          return lang;
        })
      );

      data = {
        languages: localizedLanguages,
      };

      // --uncomment below line if in future , if want to show only the default language records --
      // const filteredcategories = localizedCategories.filter(category => category !== null);

      return response.send(
        1,
        STATUS_CODE.OK,
        "Languages list",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching Languages list : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/language/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch Languages list",
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
 *   name: Language
 *   description: APIs for language operations
 */

/**
 * @swagger
 * /v1/language/get-all:
 *   get:
 *     tags: [Language]
 *     summary: Get all languages
 *     parameters:
 *       - in: query
 *         name: lang_id
 *         schema:
 *           type: string
 *         description: Filter by language ID (single value)
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by language name (case insensitive)
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Filter by language code (case insensitive)
 *       - in: query
 *         name: isRTL
 *         schema:
 *           type: boolean
 *         description: Filter by right-to-left support
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *         description: Filter by locale (case insensitive)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by language status
 *     responses:
 *       '200':
 *         description: List of languages
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
 *                   example: Languages list
 *                 data:
 *                   type: object
 *                   properties:
 *                     languages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: 60c72b2f9f1b2c001c8e4f0a
 *                           name:
 *                             type: string
 *                             example: English
 *                           code:
 *                             type: string
 *                             example: en
 *                           isRTL:
 *                             type: boolean
 *                             example: false
 *                           flag_image:
 *                             type: string
 *                             example: https://example.com/flags/en.png
 *                           locale:
 *                             type: string
 *                             example: en-US
 *                           status:
 *                             type: string
 *                             example: active
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-06-13T12:34:56.789Z
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-06-13T12:34:56.789Z
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
