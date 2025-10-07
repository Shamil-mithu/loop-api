"use strict";

const { Store, SavedStore } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const { Joi } = require("@src/lib");
const {
    STATUS_CODE,
    LOG_TYPE,
    HTTP_VERBS,
} = require("@src/constants");
const bodyParser = require("body-parser");
const {
  response,
  insertMessageLog,
  getStoreRatesAndAppCashback,
} = require("@src/utils");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------
const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getSavedStoreV1Controller(req, res) {
    try {
      const { customer } = req;
      const savedStores = await SavedStore.find({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        customer_id: customer.id,
        is_expired: false,
      }).populate("store_id", "name id logo banner currency actions_detail");

      const stores = savedStores.map((store) => {
        const { app_cashback, rates } = getStoreRatesAndAppCashback(
          store.store_id.actions_detail,
          store.store_id.currency
        );
        return {
          id: store.store_id._id,
          name: store.store_id.name,
          logo: store.store_id.logo,
          banner: store.store_id.banner,
          app_cashback,
          rates,
        };
      });

      return response.send(
        1,
        STATUS_CODE.OK,
        "saved stores",
        stores,
        res,
        null
      );
    } catch (error) {
      console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching store : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/store/saved/get-all",
        HTTP_VERBS.POST,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't save store",
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
 * /v1/store/saved/get-all:
 *   get:
 *     tags: [Store]
 *     summary: Fetch saved stores
 *     description: Retrieves a list of stores that the user has saved, including details like name, logo, banner, cashback rates, etc.
 *     responses:
 *       '200':
 *         description: Successfully fetched the list of saved stores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 savedStores:
 *                   type: array
 *                   description: List of saved stores
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Unique identifier for the store
 *                         example: "60af9245d3c41e2a4c8d4af8"
 *                       name:
 *                         type: string
 *                         description: Name of the store
 *                         example: "Mithu"
 *                       logo:
 *                         type: string
 *                         description: URL to the store's logo image
 *                         example: "https://example.com/logo.png"
 *                       banner:
 *                         type: string
 *                         description: URL to the store's banner image
 *                         example: "https://example.com/banner.png"
 *                       app_cashback:
 *                         type: string
 *                         description: Cashback percentage offered by the store's app
 *                         example: "10%"
 *                       rates:
 *                         type: array
 *                         description: List of cashback rates offered by the store
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               description: Name of the rate category (e.g., "Electronics", "Fashion")
 *                               example: "Electronics"
 *                             cashback:
 *                               type: string
 *                               description: Cashback percentage for the specified category
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
