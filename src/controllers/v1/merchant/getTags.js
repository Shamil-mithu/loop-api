"use strict";

const { MerchantTag,Language, SystemLocalization } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
  }),
  async function getAllTagsV1Controller(req, res) {
    try {
      const { customer } = req;
      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      const tags = await MerchantTag.find({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();
      if (customerLangId === defaultLangId) {
        return response.send(1, STATUS_CODE.OK, "tags", tags, res, null);
      }

      const localizedtags = await Promise.all(
        tags.map(async (merchantTag) => {
          const sysName = await SystemLocalization.findOne({
            eid: merchantTag._id.toString(),
            key: `${merchantTag._id}_merchantTag_name`,
            lang_id: customer.default_language,
          });
          const sysSubTitle = await SystemLocalization.findOne({
            eid: merchantTag._id.toString(),
            key: `${merchantTag._id}_merchantTag_sub_title`,
            lang_id: customer.default_language,
          });
          const sysImage = await SystemLocalization.findOne({
            eid: merchantTag._id.toString(),
            key: `${merchantTag._id}_merchantTag_image`,
            lang_id: customer.default_language,
          });

          if (sysName || sysImage || sysSubTitle) {
            merchantTag.name = sysName?.value ?? merchantTag.name;
            merchantTag.sub_title = sysSubTitle?.value ?? merchantTag.sub_title;
            merchantTag.image = sysImage?.value ?? merchantTag.image;

            return merchantTag;
          }
          return merchantTag;
        })
      );

      // --uncomment below line if in future , if want to show only the default language records --
      // const filteredtags = localizedtags.filter(merchantTag => merchantTag !== null);

      return response.send(1, STATUS_CODE.OK, "tags", localizedtags, res, null);
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching merchant tags : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/merchant/tag/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch merchant tags",
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
 *   name: Merchant
 *   description: APIs for merchant operations
 */

/**
 * @swagger
 * /v1/merchant/tag/get-all:
 *   get:
 *     tags: [Merchant]
 *     summary: Get all merchant tags
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *     responses:
 *       '200':
 *         description: List of merchant tags
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
 *                   example: tags
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       sub_title:
 *                         type: string
 *                       image:
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
 *                   example: Could not fetch merchant tags
 */
