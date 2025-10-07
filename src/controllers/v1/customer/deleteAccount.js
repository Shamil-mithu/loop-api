"use strict";

const { Joi } = require('@src/lib')
const { verifyAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  RESPONSE_ACTION,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { SystemLocalization } = require("@src/models");

// ----------------------------------------- CONTROLLER ---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function deleteUserAccountV1(req, res) {
    try {
      const { customer } = req;

      // Soft delete the customer by setting deleted_at
      customer.deleted_at = new Date();
      await customer.save();

      const responseLocalization = await SystemLocalization.findOne({
        lang_id: customer.default_language,
        key: `${customer.default_language}_response_${RESPONSE_ACTION.ACCOUNT_DELETED}`,
        eid: customer.default_language,
      });
      const responseMessage =
        customer.default_language === req.default_language ||
        !responseLocalization
          ? "Customer Deleted"
          : responseLocalization.value;

      return response.send(1, STATUS_CODE.OK, responseMessage, null, res, null);
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while deleting account: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer",
        HTTP_VERBS.DELETE,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't delete account",
        null,
        res,
        error
      );
    }
  },
];

// ----------------------------------------- EXPORTS ---------------------------------------------------------
module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: APIs for customer operations
 */

/**
 * @swagger
 * /v1/customer:
 *   delete:
 *     tags: [Customer]
 *     summary: Delete customer account
 *     description: Soft delete the customer account by marking it as deleted.
 *     responses:
 *       '200':
 *         description: Account deleted successfully
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
 *                   example: Customer Deleted
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
 *                   example: Internal server error
 */
