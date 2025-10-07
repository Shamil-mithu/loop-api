"use strict";

const { Router } = require("express");
const customer = require("./customer");
const auth = require("./auth");
const merchants = require('./merchant')
const categories = require('./category')
const faqs = require('./faq')
const slider = require('./slider')
const ticket = require('./ticket')
const transaction = require('./transaction')
const notification = require('./notification')
const rating = require('./rating')
const region = require('./region')
const language = require('./language')
const localization = require('./localization')
const storeLoyalty = require("./storeLoyalty.js");
const PublicRepoWebhook = require("./publicRepoWebhook.js");
const store = require("./store.js");
const currency = require("./currency");
const gamification = require("./gamification");
const engineRule = require("./engineRule");
const manualReceipt = require("./manualReceipt");
const passes = require("./pass");
const appleWalletWebhook = require("./appleWalletWebhooks");
const webhook = require("./webhook");
const web = require("./web");


const router = Router();

router.use(customer);
router.use(auth);
router.use(merchants);
router.use(categories);
router.use(faqs);
router.use(slider);
router.use(ticket);
router.use(transaction);
router.use(notification);
router.use(rating);
router.use(region);
router.use(language);
router.use(localization);
router.use(storeLoyalty);
router.use(PublicRepoWebhook);
router.use(store);
router.use(currency);
router.use(gamification);
router.use(engineRule);
router.use(manualReceipt);
router.use(passes);
router.use(appleWalletWebhook);
router.use(web);

// ------------------------- Exports --------------------------------

module.exports = Router().use("/v1", router);