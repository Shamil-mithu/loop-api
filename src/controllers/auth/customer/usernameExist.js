"use strict";

const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const { Customer } = require("@src/models");
const bodyParser = require("body-parser");
const { response, insertMessageLog } = require("@src/utils");
const { ERROR, STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");

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
        `Exception while verifying user name: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "",
        HTTP_VERBS.POST,
        null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't verify user name",
        null,
        res,
        error
      );
    }
  },
];

module.exports = CONTROLLER;
