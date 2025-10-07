"use strict";

const { Store, SavedStore, Language, SystemLocalization } = require("@src/models");
const { verifyAuth } = require("@src/middlewares");
const {
  STATUS_CODE,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const {
  response,
  insertMessageLog,
  getStoreRatesAndAppCashback,
} = require("@src/utils");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------
const CONTROLLER = [
  verifyAuth(),
  async function getStoresV1Controller(req, res) {
    try {
      const { customer } = req;

      const savedStores = await SavedStore.find({
        customer_id: customer.id,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        is_expired: false,
      });
      const savedStoresIds = new Set(
        savedStores.map((savedStore) => savedStore.store_id.toString())
      );

      const stores = await Store.find({
        $and: [
          { $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }] }, // Exclude deleted stores
          { is_published: true }, // Only return published stores
        ],
      })
        .select({
          name: 1,
          logo: 1,
          banner: 1,
          currency: 1,
          actions_detail: 1,
        })
        .limit(10);

      const defaultSystemLang = await Language.findOne({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        code: "en",
      });
      const isDefaultLang =
        customer?.default_language?.toString() ===
        defaultSystemLang._id.toString();

      let defaultLang;
      if (!isDefaultLang) {
        defaultLang = await Language.findById(customer.default_language);
      }

      const processedStores = await Promise.all(
        stores.map(async (store) => {
          const { app_cashback, rates } = getStoreRatesAndAppCashback(
            store.actions_detail,
            store.currency
          );
          let name = store.name;

          if (!isDefaultLang && defaultLang) {
            const localizedName = await SystemLocalization.findOne({
              key: `${store._id}_store_name`,
              lang_id: defaultLang._id,
            });
            name = localizedName?.value ?? store.name;
          }

          return {
            id: store._id,
            name,
            logo: store.logo,
            banner: store.banner,
            app_cashback,
            rates,
            is_saved: savedStoresIds.has(store._id.toString()), // Check saved status using Set
          };
        })
      );

      const data = { stores: processedStores };
      return response.send(1, STATUS_CODE.OK, "stores list", data, res, null);
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
 * /v1/store/get-all:
 *   get:
 *     tags: [Store]
 *     summary: Get a list of stores
 *     description: Retrieves a list of stores with relevant details like name, logo, banner, cashback rates, etc.
 *     responses:
 *       '200':
 *         description: A list of stores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_documents:
 *                   type: integer
 *                   description: The total number of store documents
 *                   example: 50
 *                 stores:
 *                   type: array
 *                   description: A list of stores
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: The store's unique identifier
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
 *                         description: The URL of the store's logo
 *                         example: "https://example.com/logo.png"
 *                       banner:
 *                         type: string
 *                         description: The URL of the store's banner image
 *                         example: "https://example.com/banner.png"
 *                       app_cashback:
 *                         type: string
 *                         description: The cashback percentage offered by the store's app
 *                         example: "10%"
 *                       rates:
 *                         type: array
 *                         description: The list of cashback rates associated with different products or categories
 *                         items:
 *                            type: object
 *                            properties:
 *                              name:
 *                                type: string
 *                                description: The name of the rate (e.g., "Electronics", "Fashion")
 *                                example: "Electronics"
 *                              cashback:
 *                                type: string
 *                                description: The cashback percentage for the given category
 *                                example: "15%"
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

