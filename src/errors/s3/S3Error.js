"use strict";

const { STATUS_CODE } = require("@src/constants");
const { STATUS_CODES } = require("http");

class S3Error extends Error {
  /**
   *
   * @param {number=} status_code
   * @param {string=} message
   * @param {Object=} details
   */
  constructor(status_code = STATUS_CODE.INTERNAL_SERVER_ERROR, message = STATUS_CODES[status_code], details = undefined) {
    super(message);

    this.status_code = status_code;
    this.details = details;
  }
}

module.exports = S3Error;
