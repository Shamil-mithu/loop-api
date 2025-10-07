"use strict";

const { Store, SavedStore, Language, SystemLocalization } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const {
  STATUS_CODE,
  LOG_TYPE,
  HTTP_VERBS,
  ERROR
} = require("@src/constants");
const {
  response,
  insertMessageLog,
  getStoreRatesAndAppCashback,
} = require("@src/utils");
const { Types } = require("mongoose");
const bodyParser = require("body-parser");
const { Joi } = require("@src/lib");

// -----------------------------------------CONTROLLER---------------------------------------------------------
const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    params: Joi.object().keys({
      store_id: Joi.string().objectId().required(),
    }),
  }),
  async function getStoresV1Controller(req, res) {
    try {
      const {
        customer,
        params: { store_id },
      } = req;

      let store = await Store.findOne({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        _id: store_id,
      });

      if (!store) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "no store with this id",
          null,
          res,
          ERROR.NOT_FOUND
        );
      }

      const defaultSystemLang = await Language.findOne({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        code: "en",
      });
      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();
      if (customerLangId !== defaultLangId) {
        const sysName = await SystemLocalization.findOne({
          eid: store._id.toString(),
          key: `${store._id}_store_name`,
          lang_id: customer?.default_language,
        });
        const sysExclusion = await SystemLocalization.findOne({
          eid: store._id.toString(),
          key: `${store._id}_store_exclusion`,
          lang_id: customer?.default_language,
        });
        const sysSpecialTerms = await SystemLocalization.findOne({
          eid: store._id.toString(),
          key: `${store._id}_store_special_terms`,
          lang_id: customer?.default_language,
        });
        const sysDeals = await SystemLocalization.findOne({
          eid: store._id.toString(),
          key: `${store._id}_store_deals_and_coupons`,
          lang_id: customer?.default_language,
        });
        console.log({ sysName, sysExclusion });

        if (sysName || sysExclusion || sysSpecialTerms || sysDeals) {
          store.name = sysName?.value ?? store.name;
          store.exclusion = sysExclusion?.value ?? store.exclusion;
          store.special_terms = sysSpecialTerms?.value ?? store.special_terms;
          store.deals_and_coupons = sysDeals?.value ?? store.deals_and_coupons;
        }
      }

      const { app_cashback, rates } = getStoreRatesAndAppCashback(
        store.actions_detail,
        store.currency
      );

      store = {
        id: store._id,
        name: store.name,
        exclusion: store.exclusion,
        special_terms: store.special_terms,
        deals_and_coupons: store.deals_and_coupons,
        logo: store.logo,
        banner: store.banner,
        app_cashback,
        rates,
        url: store.url,
      };

      const data = { store };
      return response.send(1, STATUS_CODE.OK, "store data", data, res, null);
    } catch (error) {
      // console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching stores list : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/store/most",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch stores list",
        null,
        res,
        error
      );
    }
  },
];

// -----------------------------------------EXPORTS---------------------------------------------------------

module.exports = CONTROLLER;

/** 
 * @swagger
 * tags:
 *   name: Store
 *   description: APIs for store operations
 */

/**
 * @swagger
 * /v1/store/{store_id}:
 *   get:
 *     tags: [Store]
 *     summary: Get a store by ID
 *     description: Retrieves detailed information for a specific store using its unique store ID.
 *     parameters:
 *       - in: path
 *         name: store_id
 *         type: string
 *         required: true
 *         description: The unique identifier of the store.
 *         example: "60af9245d3c41e2a4c8d4af8"
 *     responses:
 *       '200':
 *         description: Successfully retrieved the store details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_documents:
 *                   type: integer
 *                   description: Total number of store documents found (should be 1 for a specific store)
 *                   example: 1
 *                 stores:
 *                   type: array
 *                   description: List of stores (should contain only the requested store if the store_id is valid)
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: The unique identifier of the store
 *                         example: "60af9245d3c41e2a4c8d4af8"
 *                       name:
 *                         type: string
 *                         description: The name of the store
 *                         example: "Mithu"
 *                       currency:
 *                         type: string
 *                         description: The currency code used by the store
 *                         example: "SAR"
 *                       logo:
 *                         type: string
 *                         description: URL of the store's logo
 *                         example: "https://example.com/logo.png"
 *                       app_cashback:
 *                         type: string
 *                         description: The cashback percentage offered by the store's app
 *                         example: "10%"
 *                       rates:
 *                         type: array
 *                         description: A list of cashback rates for different categories within the store
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               description: The name of the cashback category (e.g., "Electronics", "Fashion")
 *                               example: "Electronics"
 *                             cashback:
 *                               type: string
 *                               description: The cashback percentage for the specified category
 *                               example: "15%"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Could not process the request"
 */
