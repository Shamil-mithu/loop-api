"use strict";

const { MerchantVibe, Language, SystemLocalization } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------
const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getAllVibesV1Controller(req, res) {
    try {
      const { customer } = req;
      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      const currDate = new Date();
      let vibes = await MerchantVibe.find({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        expiry: { $gte: currDate },
      }).populate("merchant_id");

      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();

      // Group by merchant_id
      let groupedVibes = vibes.reduce((acc, vibe) => {
        const merchantId = vibe.merchant_id.toString();

        // Initialize merchant group if it doesn't exist
        if (!acc[merchantId]) {
          acc[merchantId] = {
            merchant_id: vibe.merchant_id._id,
            merchant_logo: vibe.merchant_id.logo,
            merchant_name: vibe.merchant_id.name,
            stories: [],
          };
        }

        // Add story to the corresponding merchant
        acc[merchantId].stories.push({
          story_id: vibe._id.toString(),
          story_image: vibe.image,
          swipeText: vibe.swipe_text || null,
        });

        return acc;
      }, {});

      // Convert the grouped vibes back to an array
      let groupedVibesArray = Object.values(groupedVibes);

      if (customerLangId !== defaultLangId) {
        groupedVibesArray = await Promise.all(
          groupedVibesArray.map(async (merchant) => {
            merchant.stories = await Promise.all(
              merchant.stories.map(async (story) => {
                const sysImage = await SystemLocalization.findOne({
                  eid: story.story_id,
                  key: `${story.story_id}_merchantVibe_image`,
                  lang_id: customer.default_language,
                });

                if (sysImage) {
                  story.story_image = sysImage?.value ?? story.story_image;
                }

                return story;
              })
            );
            return merchant;
          })
        );
      }

      return response.send(
        1,
        STATUS_CODE.OK,
        "vibes",
        groupedVibesArray,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching merchants vibes list: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/merchant/vibe/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch merchants vibes list",
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
 * /v1/merchant/vibe/get-all:
 *   get:
 *     tags: [Merchant]
 *     summary: Get all merchant vibes
 *     description: Retrieves all active merchant vibes that are not marked as deleted and have not expired. The response includes stories for each merchant vibe, with optional localization for images based on the user's default language.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the list of merchant vibes
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
 *                   example: Vibes retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       merchant_id:
 *                         type: string
 *                         example: "607c191e810c19729de860ea"  # Example merchant ID
 *                       merchant_logo:
 *                         type: string
 *                         example: "https://example.com/logo.png"  # Example logo URL
 *                       merchant_name:
 *                         type: string
 *                         example: "Merchant Name"  # Example merchant name
 *                       stories:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             story_id:
 *                               type: string
 *                               example: "607c191e810c19729de860eb"  # Example story ID
 *                             story_image:
 *                               type: string
 *                               example: "https://example.com/story_image.png"  # Example story image URL
 *                             swipeText:
 *                               type: string
 *                               nullable: true
 *                               example: "Swipe for more!"  # Example swipe text
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
 *                   example: Could not fetch merchant vibes
 */
