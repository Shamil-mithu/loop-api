"use strict";

const client = require("./client");
const { TAQNYAT_SENDER } = require("@src/config");
const responseHandler = require("@src/lib/responseHandler.js");

const {
  Constants: { OTP_SENDER_PLATFORM, LOG_TYPE },
} = require("@mithu/models-constants");
const { insertSmsLog } = require("@root/src/utils");

async function sendOtp(message, recipients) {
  let log_type = LOG_TYPE.INFO;
  let detail = null;
  try {
    const response = await responseHandler(
      client.post(`/v1/messages`, {
        sender: TAQNYAT_SENDER,
        body: `OTP for Mithu: ${message} From WaslTech`,
        recipients: [recipients],
      })
    );
    detail = response;
    return response;
  } catch (error) {
    log_type = LOG_TYPE.ERROR;
    detail = error;
    throw new Error(error.message ?? error);
  } finally {
    await insertSmsLog(log_type, OTP_SENDER_PLATFORM.TAQNYAT, detail);
  }
}

module.exports = { sendOtp };
