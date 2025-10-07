"use strict";

const { STATUS_CODE, ERROR } = require("../constants");

/**
 *
 * @param {Object[]} details
 * @returns {Object}
 */
function serialize(details) {
  console.log(details)
  return details.map(detail => detail.message).join('\n');
  return details.reduce((acc, cur) => {
    const key = cur.path.join(".");

    if (!acc[key]) acc[key] = [];

    acc[key].push(cur.message);
    console.log(acc)
    console.log(acc[0])

    return acc;
  }, {});
}

/**
 *
 * @param {{ body: import("joi")=, query: import("joi")= }}schema
 * @returns {(function(*, *, *): (*|undefined))|*}
 */
function validate(schema = {}) {
  const { body, query } = schema;

  return function validator(req, res, next) {
    if (body) {
      const { error, value } = body.label("body").validate(req.body, { abortEarly: false });

      if (error != null) {
        return res.status(STATUS_CODE.UNPROCESSABLE_ENTITY).json({
          status: 0,
          error: ERROR.UNPROCESSABLE_ENTITY,
          message: serialize(error.details),
        });
      }

      req.body = value;
    }

    if (query) {
      const { error, value } = query.label("query").validate(req.query, { abortEarly: false });

      if (error != null) {
        return res.status(STATUS_CODE.BAD_REQUEST).json({
          status: 0,
          error: ERROR.BAD_REQUEST,
          message: serialize(error.details),
        });
      }

      req.query = value;
    }

    next();
  };
}

module.exports = validate;
