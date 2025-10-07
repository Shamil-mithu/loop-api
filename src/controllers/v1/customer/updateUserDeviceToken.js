"use strict";

const { Joi } = require('@src/lib')
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS, SETTINGS_KEYS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { firstLoginTopup } = require('@src/services');
const { Settings } = require('@root/src/models');

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object()
      .keys({
        token: Joi.string().required(),
      })
      .required(),
  }),
  async function updateUserDeviceTokenV1(req, res) {
    try {
      const {
        customer,
        body: { token },
      } = req;

      console.log(SETTINGS_KEYS.SIGNUP_TOPUP_TO_USERS)
      if (customer.device_token === undefined) {
        const isSignupTopup = await Settings.findOne({
          key: SETTINGS_KEYS.SIGNUP_TOPUP_TO_USERS
        })
        if (isSignupTopup?.value == "true") {
          firstLoginTopup(customer, token)
        }
      }
      customer.device_token = token;
      await customer.save();
      return response.send(
        1,
        STATUS_CODE.OK,
        "device token updated",
        null,
        res,
        null
      );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating device token : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer/device-token",
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't update device token ",
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
 * /v1/customer/device-token:
 *   put:
 *     tags: [Customer]
 *     summary: Update customer device token
 *     description: Update customer device token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Device token for push notifications
 *                 example: jkjhgdfdfghgf2345678iujhgc
 *     responses:
 *       '200':
 *         description: Device token updated successfully
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
 *                   example: Device token updated
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
