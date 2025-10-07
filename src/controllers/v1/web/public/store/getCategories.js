"use strict";

const { StoreCategory, Language, SystemLocalization } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS, STORE_CATEGORY_STATUS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getAllStoreTagsV1Controller(req, res) {
    try {
      const { customer } = req;
      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      const categories = await StoreCategory.find({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        category_status: STORE_CATEGORY_STATUS.ACTIVE
      }).sort({
        display_order: 'asc'
      });

      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();
      if (customerLangId === defaultLangId) {
        const data = {
          categories
        }
        return response.send(1, STATUS_CODE.OK, "categories", data, res, null);
      }

      const localizedCategories = await Promise.all(
        categories.map(async (storeCategory) => {
          const sysName = await SystemLocalization.findOne({
            eid: storeCategory._id.toString(),
            key: `${storeCategory._id}_storeCategory_name`,
            lang_id: customer.default_language,
          });
          storeCategory.name = sysName?.value ?? storeCategory.name;
          return storeCategory;
        })
      );
      const data = {
        categories: localizedCategories
      }

      return response.send(1, STATUS_CODE.OK, "categories", data, res, null);
    } catch (error) {
      console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching store categories : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/store/category/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch store categories",
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
 * /v1/store/category/get-all:
 *   get:
 *     tags: [Store]
 *     summary: Get all store categories
 *     responses:
 *       '200':
 *         description: List of store categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: integer
 *                   example: 1
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: categories
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       deleted_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
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
 *                   example: Could not fetch store categories
 */
