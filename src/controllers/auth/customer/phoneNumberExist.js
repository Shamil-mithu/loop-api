"use strict";

const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const { Customer } = require("@src/models");
const bodyParser = require("body-parser");
const { response, insertMessageLog } = require('@src/utils')
const { ERROR, STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const jwt = require("jsonwebtoken");

const CONTROLLER = [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  validate({
    body: Joi.object()
      .keys({
        phone_number: Joi.string(),
      })
      .required(),
  }),
  async function isPhoneNumberExistV1Controller(req, res) {
    try {
      const { phone_number } = req.body;
      console.log(phone_number);

      const customer = await Customer.findOne({
        phone_number: phone_number,
        deleted_at: { $exists: false },
      });

      if (customer == null) {
        return response.send(
          1,
          STATUS_CODE.OK,
          `Phone number available`,
          null,
          res,
          null
        );
      } else
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          "Phone number already registered",
          null,
          res,
          ERROR.PHONE_NUMBER_ALREADY_REGISTERED
        );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while verifying phone number: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/auth/customer/:phone_number",
        HTTP_VERBS.POST,
        null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't verify phone number",
        null,
        res,
        error
      );
    }
  },
];

module.exports = CONTROLLER;


// /**
//  * @swagger
//  * tags:
//  *   name: Authentication
//  *   description: APIs for customer authentication
//  */

// /**
//  * @swagger
//  * /v1/auth/customer/:phone_number:
//  *   post:
//  *     tags: [Authentication]
//  *     summary: Register a new customer
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               email:
//  *                 type: string
//  *                 format: email
//  *               country_code:
//  *                 type: string
//  *               gender:
//  *                 type: string
//  *                 enum: [male, female, other]
//  *               date_of_birth:
//  *                 type: object
//  *                 properties:
//  *                   date:
//  *                     type: integer
//  *                   month:
//  *                     type: integer
//  *                   year:
//  *                     type: integer
//  *               phone_number:
//  *                 type: object
//  *                 properties:
//  *                   code:
//  *                     type: string
//  *                   number:
//  *                     type: string
//  *               name:
//  *                 type: object
//  *                 properties:
//  *                   first:
//  *                     type: string
//  *                   last:
//  *                     type: string
//  *     responses:
//  *       200:
//  *         description: Customer registered successfully
//  *       409:
//  *         description: Customeromer already exists
//  */