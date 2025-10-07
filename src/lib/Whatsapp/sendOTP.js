"use strict";

const client = require("./client");
const responseHandler = require("@src/lib/responseHandler.js");
const { WHATSAPP_URI } = require("@src/config");

const {
  Constants: { OTP_SENDER_PLATFORM, LOG_TYPE },
} = require("@mithu/models-constants");
const { insertSmsLog } = require("@root/src/utils");

async function send(text, number) {
  let log_type = LOG_TYPE.INFO;
  let detail = null;
  try {
    const response = await responseHandler(
      client.post(WHATSAPP_URI, {
        clientId: "106",
        template_message_id: "423",
        numbers: number,
        template_params: {
          body: {
            type: "BODY",
            text: "{{1}} is your verification code. For your security, do not share this code.",
            parameters: [
              {
                sampleValue: text,
                value: text,
              },
            ],
          },
          buttons: [
            {
              url: "https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp{{1}}",
              text: "Copy code",
              sub_type: "URL",
              value: text,
              type: "BUTTONS",
              sampleValue: `https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=otp${text}`,
            },
          ],
        },
      })
    );
    detail = response;
    return response;
  } catch (error) {
    log_type = LOG_TYPE.ERROR;
    detail = error;
    throw new Error(error.message ?? error);
  } finally {
    await insertSmsLog(log_type, OTP_SENDER_PLATFORM.WHATSAPP, detail);
  }
}

module.exports = { send };
