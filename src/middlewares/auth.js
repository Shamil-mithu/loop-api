"use strict"

const jwt = require('jsonwebtoken');
const { response, extractUserAgentData } = require("@src/utils");
const { Customer, Language, UserSession } = require("@src/models");
const { STATUS_CODE, ERROR, USER_SESSION_STATUS } = require("@src/constants");

function verifyAuth() {
  return async function (req, res, next) {
    if (!req.headers.authorization) {
      return response.send(0, 401, "Access token missing", null, res, null);
    }
    let token;
    const hasBearerPrefix = req.headers.authorization.startsWith("Bearer ");
    if (hasBearerPrefix) token = req.headers.authorization.substring(7);
    else token = req.headers.authorization;

    if (!token || token == null) {
      return response.send(0, 401, "Access token missing", null, res, null);
    }
    jwt.verify(token, process.env.JWT_AUTH_SECRET, async (err, decoded) => {
      if (err) {
        // console.error(err.message)
        if (err.message == "jwt expired") {
          const payload = jwt.decode(token);
          token = jwt.sign(
            { user_id: payload.user_id, mobile_type: payload?.mobile_type },
            process.env.JWT_AUTH_SECRET,
            { expiresIn: "7d" }
          );
          return res
            .status(401)
            .json({
              success: false,
              message: "Unauthorized - Session Expired",
              newToken: token,
            });
        }
        return response.send(0, 401, err.message, null, res, err);
      }

      req.id = decoded.user_id;
      req.mobile_type = decoded?.mobile_type

      const customer = await Customer.findOne({
        _id: req.id,
        deleted_at: { $exists: false },
      });
      req.customer = customer;
      const defaultLang = await Language.findOne({
        code: "en",
      });
      req.default_language = defaultLang.id;

      if (!customer) {
        return response.send(
          0,
          STATUS_CODE.UNAUTHORIZED,
          "Invalid Auth key",
          null,
          res,
          ERROR.UNAUTHORIZED
        );
      }

      // check session
      const userAgentInfo = extractUserAgentData(req);
      const session = await UserSession.findOne({
        deviceId: userAgentInfo.deviceId,
        user: customer.id,
      });
      if (session && session.status !== USER_SESSION_STATUS.ACTIVE) {
        return response.send(
          0,
          STATUS_CODE.UNAUTHORIZED,
          `unauthorized`,
          null,
          res,
          ERROR.UNAUTHORIZED
        );
      }

      // create/update user session
      await UserSession.findOneAndUpdate(
        {
          deviceId: userAgentInfo.deviceId,
          user: customer.id,
        },
        {
          ...userAgentInfo,
          user: customer.id,
          last_active: Date.now(),
          status: USER_SESSION_STATUS.ACTIVE,
        },
        {
          upsert: true,
        }
      );
      next();
    });
  };
}

module.exports = verifyAuth;
