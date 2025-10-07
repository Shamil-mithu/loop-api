const { MessageLog } = require("@src/models");
const { LOG_PLATFORM } = require("@src/constants");

const insertMessageLog = async (
  log_type,
  title,
  detail,
  url,
  url_type,
  user
) => {
  try {
    const logData = {
      type: log_type,
      title,
      detail,
      url,
      url_type,
      user,
      platform: LOG_PLATFORM.MOBILE_APP,
    };
    // console.log('logData',logData)
    await MessageLog.create(logData);
  } catch (error) {
    console.log(
      `ERROR insering message log of type ${type} with title: ${title}` +
        error.message ?? error
    );
  }
};

module.exports = insertMessageLog;
