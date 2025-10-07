"use strict";

const { Router } = require("express");
const cors = require("cors");

const merchants = require('./merchant')
const categories = require('./category')
const faqs = require('./faq')
const slider = require('./slider')
const rating = require('./rating')
const region = require('./region')
const language = require('./language')
const localization = require('./localization')
const store = require("./store.js");
const currency = require("./currency");

const router = Router();

router.use(cors({
  origin: ["https://dev-mithu-webapp.mithu.com/","*"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

router.use(merchants);
router.use(categories);
router.use(faqs);
router.use(slider);
router.use(rating);
router.use(region);
router.use(language);
router.use(localization);
router.use(store);
router.use(currency);

// ------------------------- Exports --------------------------------

module.exports = Router().use("/web-app", router);