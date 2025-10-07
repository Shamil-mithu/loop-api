const {
  Constants: { LOG_PLATFORM },
  Models: { SmsLog },
} = require("@mithu/models-constants");

const insertSmsLog = async (log_type, sender, detail) => {
  try {
    const logData = {
      type: log_type,
      sender,
      detail,
      platform: LOG_PLATFORM.MOBILE_APP,
    };
    await SmsLog.create(logData);
  } catch (error) {
    console.log(
      `ERROR insering sms log of sender: ${sender}` + error.message ?? error
    );
  }
};

module.exports = insertSmsLog;
