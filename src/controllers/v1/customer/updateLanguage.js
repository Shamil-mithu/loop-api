"use strict";

const { Customer, Language, SystemLocalization } = require("@src/models");
const { Joi } = require('@src/lib')
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  ERROR,
  RESPONSE_ACTION,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object()
      .keys({
        language_id: Joi.string().required().allow(null).allow(''),
      })
      .required(),
  }),
  async function updateUserDefaultLanguageV1(req, res) {
    try {
      const {
        customer,
        body: { language_id },
      } = req;

      if (language_id) {
        const isLangExist = await Language.findById(language_id);
        if (!isLangExist) {
          return response.send(
            0,
            STATUS_CODE.BAD_REQUEST,
            "language not supported",
            null,
            res,
            ERROR.BAD_REQUEST
          );
        }
        customer.default_language = isLangExist.id;
        await customer.save();
        const responseLocalization = await SystemLocalization.findOne({
          lang_id: customer.default_language,
          key: `${customer.default_language}_response_${RESPONSE_ACTION.DEFAULT_LANGUAGE_UPDATED}`, // langId_response_action
          eid: customer.default_language,
        });

        const responseMessage =
          customer.default_language == req.default_language ||
          !responseLocalization
            ? "default languae updated"
            : responseLocalization.value;
        return response.send(
          1,
          STATUS_CODE.OK,
          responseMessage,
          null,
          res,
          null
        );
      }
      const responseLocalization = await SystemLocalization.findOne({
        lang_id: customer.default_language,
        key: `${customer.default_language}_response_${RESPONSE_ACTION.SELECT_LANGUAGE_TO_UPDATE}`, // langId_response_action
        eid: customer.default_language,
      });

      const responseMessage =
        customer.default_language == req.default_language ||
        !responseLocalization
          ? "select language to update"
          : responseLocalization.value;
      return response.send(1, STATUS_CODE.OK, responseMessage, null, res, null);
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating default languae: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer/default-language",
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't update default languae",
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
 *   name: Customer
 *   description: APIs for customer operations
 */

/**
 * @swagger
 * /v1/customer/default-language:
 *   put:
 *     tags: [Customer]
 *     summary: Update customer default language
 *     description: Update the default language for the customer.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language_id:
 *                 type: string
 *                 description: ID of the language to set as default
 *                 example: 123456789765
 *             required:
 *               - language_id
 *     responses:
 *       200:
 *         description: Default language updated successfully
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
 *                   example: Default language updated
 *       400:
 *         description: Bad request - language not supported
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
 *                   example: language not supported
 *       401:
 *         description: Unauthorized - Invalid or missing access token
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
 *                   example: Unauthorized - Invalid or missing access token
 *       500:
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
 *                   example: Internal server error
 */
