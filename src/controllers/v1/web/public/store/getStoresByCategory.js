"use strict";

const { Store, Language, SavedStore, SystemLocalization } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
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
const { Joi } = require("@src/lib");
const { Types } = require("mongoose");
const bodyParser = require("body-parser");

// -----------------------------------------CONTROLLER---------------------------------------------------------
const CONTROLLER = [
  verifyAuth(),
  validate({
    body: Joi.object().keys({
      store_category_id: Joi.string().objectId().required().allow(""),
      store_tag_id: Joi.string().objectId().optional().allow(""),
    }),
  }),
  async function getStoresV1Controller(req, res) {
    try {
      const {
        customer,
        body: { store_category_id, store_tag_id },
      } = req;
      const query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };
      if (store_tag_id && store_tag_id?.length > 0) {
        query.tags = store_tag_id;
      }
      if (store_category_id && store_category_id?.length > 0) {
        query.categories = store_category_id;
      }
      const stores = await Store.find(query)
        .select({
          name: 1,
          logo: 1,
          banner: 1,
          currency: 1,
          actions_detail: 1,
        })
        .limit(10);

      const savedStores = await SavedStore.find({
        customer_id: customer.id,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        is_expired: false,
      });
      const savedStoresIds = new Set(
        savedStores.map((savedStore) => savedStore.store_id.toString())
      );

      const defaultSystemLang = await Language.findOne({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        code: "en",
      });
      console.log(
        "🚀 ~ getStoresV1Controller ~ defaultSystemLang:",
        defaultSystemLang
      );

      const isDefaultLang =
        customer?.default_language?.toString() ===
        defaultSystemLang?.id.toString();

      let defaultLang;
      if (!isDefaultLang) {
        defaultLang = await Language.findById(customer.default_language);
      }
      const processedStores = await Promise.all(
        stores.map(async (store) => {
          let name = store.name;
          const { app_cashback, rates } = getStoreRatesAndAppCashback(
            store.actions_detail,
            store.currency
          );

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
      console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching stores through category : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/store/get-through-category",
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
 * /v1/store/get-by-category:
 *   post:
 *     tags: [Store]
 *     summary: Get a list of stores by category
 *     description: Retrieves a list of stores based on the provided category and tag filters.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               store_category_id:
 *                 type: string
 *                 description: The unique identifier for the store category.
 *                 example: "6735dffc0ad75bd326737de9"
 *               store_tag_id:
 *                 type: string
 *                 description: The unique identifier for the store tag.
 *                 example: "6735dffc0ad75bd326737de9"
 *     responses:
 *       '200':
 *         description: Successfully retrieved a list of stores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_documents:
 *                   type: integer
 *                   description: Total number of store documents matching the given category and tag
 *                   example: 50
 *                 stores:
 *                   type: array
 *                   description: A list of stores that match the given category and tag
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
 *                       delivery_time:
 *                         type: integer
 *                         description: The estimated delivery time in minutes
 *                         example: 30
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
 *                         description: A list of cashback rates for different categories within the store
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               description: The name of the rate category (e.g., "Electronics", "Fashion")
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
