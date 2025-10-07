"use strict";

const client = require("./client");
const responseHandler = require("@src/lib/responseHandler.js");
const { WHATSAPP_URI } = require("@src/config");
const {
  Constants: { OTP_SENDER_PLATFORM, LOG_TYPE },
} = require("@mithu/models-constants");
const { insertSmsLog } = require("@root/src/utils");

async function send(merchantName, merchantPoints, mithuPoints, number) {
  let log_type = LOG_TYPE.INFO;
  let detail = null;
  try {
    const response = await responseHandler(
        client.post(`${WHATSAPP_URI}`,
            {
                "numbers": number,
                "clientId": "106",
                "template_message_id": "229",
                "template_params": {
                    "body": {
                        "type": "BODY",
                        "text": `🎉 Welcome to the {{1}} loyalty program, powered by Mithu! 🥳 We're thrilled to have you on board! Guess what? You’ve just earned a whopping  {{2}} points for your visit today! And that's not all—you've also scored  {{3}} Mithu points, redeemable at any restaurant in our network! 🍽
Dive into the Mithu app to track your points, conquer exciting challenges, and keep the rewards rolling in! 🚀
Don’t wait—download the Mithu App now and start enjoying your perks!
https://mithu.com/download-app`,
                        "parameters": [
                            {
                                "value": merchantName,
                                "order": 1,
                                "generic": true
                            },
                            {
                                "value": merchantPoints,
                                "order": 2,
                                "generic": true
                            },
                            {
                                "value": mithuPoints,
                                "order": 3,
                                "generic": true
                            }
                        ]
                    }
                },
            }

        )
    )
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

module.exports = send;
