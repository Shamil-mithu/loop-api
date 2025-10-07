"use strict"

const jwt = require('jsonwebtoken');
const { response } = require('@src/utils')

function verifyAuth() {
  return async function (req, res, next) {

    if (!req?.headers?.authorization) {
      return response.send(0, 401, 'Access token missing', null, res, null)
    }
    const token = req.headers.authorization.substring(7);

    if (!token || token == null) {
      return response.send(0, 401, 'Access token missing', null, res, null)
    }
    jwt.verify(token, process.env.JWT_PUBLIC_REPO_AUTH_SECRET, async (err, decoded) => {
      if (err) {
        return response.send(0, 401, err.message, null, res, err)
      }
      next();
    });
  };
}

module.exports = verifyAuth;
