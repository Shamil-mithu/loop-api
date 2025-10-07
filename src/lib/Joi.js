"use strict";

const Joi = require("joi");
const { Types } = require("mongoose");
const { parsePhoneNumber } = require("libphonenumber-js");

const { ObjectId } = Types;

module.exports = Joi
  .extend({
    base: Joi.string(),
    type: "string",
    messages: {
      "string.objectId": "{{#label}} must be a valid object id",
      "string.phoneNumber": "{{#label}} must be a valid phone number",
      "string.numeric": "{{#label}} must only contain numbers [0..9]",
    },
    rules: {
      objectId: {
        method() {
          return this.$_addRule("objectId");
        },
        validate(value, helpers) {
          if (!ObjectId.isValid(value)) return helpers.error("string.objectId");

          return new ObjectId(value);
        },
      },
      phoneNumber: {
        method() {
          return this.$_addRule("phoneNumber");
        },
        validate(value, helpers) {
          try {
            const parsed = parsePhoneNumber(value);

            if (parsed == null || !parsed.isValid() || parsed.number !== value) return helpers.error("string.phoneNumber");

            return parsed;
          } catch (error) {
            return helpers.error("string.phoneNumber");
          }
        },
      },
      numeric: {
        method() {
          return this.$_addRule("numeric");
        },
        validate(value, helpers) {
          if (!/^[0-9]*$/.test(value)) return helpers.error("string.numeric");

          return value;
        },
      },
    },
  });
