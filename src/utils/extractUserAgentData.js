const { LOG_PLATFORM } = require("@src/constants");
var useragent = require("useragent");

const extractUserAgentData = (req) => {
  const agentString = req.headers["user-agent"] || "Unknown";
  const agent = useragent.parse(agentString);

  const ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;

  const userAgent = {
    deviceId: req.headers["device-id"],
    browser: agent.toAgent() || "Native App",
    device: agent.device.toString() || "Mobile Device",
    os: agent.os.toString() || "Unknown",
    ip,
    user: req?.user?.id || null,
    last_active: Date.now(),
    platform: LOG_PLATFORM.MOBILE_APP,
  };

  return userAgent;
};

module.exports = extractUserAgentData;
