"use strict";

const { Category, Language, SystemLocalization } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  CATEGORY_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    query: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
      select: Joi.array()
        .items(Joi.string().valid(...Category.getSelectableFields()))
        .default([]),
    }),
  }),
  async function getAllTagsV1Controller(req, res) {
    try {
      let { limit, page } = req.query;
      const { customer } = req;

      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      let categories = await Category.find({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        category_status: CATEGORY_STATUS.ACTIVE,
      }).sort({ display_order: "asc" });

      let data = {
        categories,
      };

      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();

      if (customerLangId === defaultLangId) {
        return response.send(1, STATUS_CODE.OK, "Categories", data, res, null);
      }

      const localizedCategories = await Promise.all(
        categories.map(async (category) => {
          const sysName = await SystemLocalization.findOne({
            eid: category._id.toString(),
            key: `${category._id}_category_name`,
            lang_id: customer.default_language,
          });
          const sysImage = await SystemLocalization.findOne({
            eid: category._id.toString(),
            key: `${category._id}_category_image`,
            lang_id: customer.default_language,
          });

          if (sysName || sysImage) {
            category.name = sysName?.value ?? category.name;
            category.image = sysImage?.value ?? category.image;

            return category;
          }
          return category;
        })
      );

      data = {
        categories: localizedCategories,
      };

      // --uncomment below line if in future , if want to show only the default language records --
      // const filteredcategories = localizedCategories.filter(category => category !== null);

      return response.send(1, STATUS_CODE.OK, "categories", data, res, null);
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching categories : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/category/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't fetch categories",
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
 *   name: Category
 *   description: APIs for category operations
 */

/**
 * @swagger
 * /v1/category/get-all:
 *   get:
 *     tags: [Category]
 *     summary: Get all categories with optional pagination and field selection
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of categories to retrieve per page
 *       - in: query
 *         name: select
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum:
 *               - _id
 *               - name
 *               - image
 *               - display_order
 *               - category_status
 *               - created_by
 *         description: Fields to include in the response (optional)
 *     responses:
 *       '200':
 *         description: A list of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total_documents:
 *                       type: integer
 *                       example: 10
 *                   description: Metadata about the list, including total documents
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60c72b2f9b1e8b0c6b8e2e7d"
 *                       name:
 *                         type: string
 *                         example: "Electronics"
 *                       image:
 *                         type: string
 *                         example: "/images/electronics.png"
 *                       display_order:
 *                         type: integer
 *                         example: 1
 *                       category_status:
 *                         type: string
 *                         example: "ACTIVE"
 *                       created_by:
 *                         type: string
 *                         example: "60c72b2f9b1e8b0c6b8e2e7e"
 *       '400':
 *         description: Invalid query parameters
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
 *                   example: "Invalid query parameters"
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
 *                   example: "Could not fetch categories"
 */
