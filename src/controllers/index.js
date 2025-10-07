"use strict";

// ------------------------- Exports -------------------------

module.exports = {
  get: require('./get'),
  ...require("./auth"),
  ...require('./v1')
};
