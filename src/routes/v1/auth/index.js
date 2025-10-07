"use strict";

const { Router } = require("express");
const interactionRoutes = require("./interaction");
const token = require('./token')
const customer = require('./customer')
const router = Router();

router.use(interactionRoutes);
// router.use(token)
router.use(customer)


// ------------------------- Exports --------------------------------

module.exports = Router().use("/auth", router);