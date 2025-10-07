"use strict";

const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const CONTROLLER = [
  bodyParser.urlencoded({ extended: true }),
  function loginInteraction(req, res) {
      return res.render("screens/login");
    }
];

module.exports = CONTROLLER;