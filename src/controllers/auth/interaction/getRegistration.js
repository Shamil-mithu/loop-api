"use strict";

const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const CONTROLLER = [
  bodyParser.urlencoded({ extended: true }),
  function registerInteraction(req, res) {
      return res.render("screens/register");
    }
];

module.exports = CONTROLLER;