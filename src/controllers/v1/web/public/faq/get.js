"use strict";

const { FAQ, Language, SystemLocalization } = require("@src/models");
const { verifyAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getAllFAQsV1Controller(req, res) {
    const { customer } = req;
    const defaultSystemLang = await Language.findOne({
      code: "en",
      $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
    });

    try {
      const faqs = await FAQ.find({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      }).sort({ display_order: "asc" });
      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();

      if (customerLangId === defaultLangId) {
        return response.send(1, STATUS_CODE.OK, "FAQs", faqs, res, null);
      }

      const localizedFaqs = await Promise.all(
        faqs.map(async (faq) => {
          const sysTitle = await SystemLocalization.findOne({
            eid: faq._id.toString(),
            key: `${faq._id}_faq_title`,
            lang_id: customer.default_language,
          });
          const sysDescription = await SystemLocalization.findOne({
            eid: faq._id.toString(),
            key: `${faq._id}_faq_description`,
            lang_id: customer.default_language,
          });

          if (sysTitle && sysDescription) {
            faq.title = sysTitle.value;
            faq.description = sysDescription.value;

            return faq;
          }

          return faq;
        })
      );

      // --uncomment below line if in future , want to show only the default language records --
      // const filteredFaqs = localizedFaqs.filter(faq => faq !== null);

      return response.send(1, STATUS_CODE.OK, "FAQs", localizedFaqs, res, null);
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching FAQs : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/faq/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch FAQs",
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
 *   name: FAQ
 *   description: APIs for FAQ operations
 */

/**
 * @swagger
 * /v1/faq/get-all:
 *   get:
 *     tags: [FAQ]
 *     summary: Get all FAQs
 *     description: Retrieve a list of all FAQs. If the customer's language differs from the default language, localized titles and descriptions will be provided.
 *     responses:
 *       '200':
 *         description: A list of FAQs successfully retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: FAQs
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60c72b2f9b1d4f4f5c8f16bc"
 *                       title:
 *                         type: string
 *                         example: What is your return policy?
 *                       description:
 *                         type: string
 *                         example: You can return any item within 30 days of purchase if it's in its original condition.
 *                       status:
 *                         type: string
 *                         example: active
 *                       display_order:
 *                         type: integer
 *                         example: 1
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
 *                   example: Could not fetch FAQs
 */
