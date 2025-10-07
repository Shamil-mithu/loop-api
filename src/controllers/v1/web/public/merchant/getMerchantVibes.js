"use strict";

const { MerchantVibe, Language, SystemLocalization } = require("@src/models");
const { Joi } = require("@src/lib");
const { validate } = require("@src/middlewares");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  validate({
    params: Joi.object().keys({
      merchantId: Joi.string().required(),
    }),
  }),
  async function getAllVibesV1Controller(req, res) {
    try {
      const { merchantId } = req.params;
      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      const currDate = new Date();
      let vibes = await MerchantVibe.find({
        deleted_at: { $exists: false },
        merchant_id: merchantId,
        expiry: { $gte: currDate },
      });
      vibes = await Promise.all(
        vibes.map(async (vibe) => {

          return (vibe = {
            ...vibe._doc,
            likes: Math.floor(Math.random() * 701) + 1000, // 1000–1700
            seenCount: Math.floor(Math.random() * 5001) + 5000, // 5000–10000
            is_seen: true,
            is_liked: false,
            formatted_createdAt_day: vibe?.created_at.toLocaleDateString(
              "en-US",
              {
                weekday: "long",
              }
            ),
            formatted_createdAt_month: vibe?.created_at.toLocaleDateString(
              "en-US",
              {
                month: "short",
                day: "numeric",
              }
            ),
          });
        })
      );
      // const customerLangId = customer?.default_language?.toString();
      // const defaultLangId = defaultSystemLang._id.toString();
      // if (customerLangId === defaultLangId) {
      return response.send(1, STATUS_CODE.OK, "vibes", vibes, res, null);
      // }

      const localizedvibes = await Promise.all(
        vibes.map(async (merchantVibe) => {
          const sysImage = await SystemLocalization.findOne({
            eid: merchantVibe._id.toString(),
            key: `${merchantVibe._id}_merchantVive_image`,
            lang_id: customer.default_language,
          });

          if (sysImage) {
            merchantVibe.image = sysImage?.value ?? merchantVibe.image;
            return merchantVibe;
          }
          return {
            ...merchantVibe,
            formatted_createdAt_day:
              merchantVibe?.created_at.toLocaleDateString("ar-SA", {
                weekday: "long",
              }),
            formatted_createdAt_month:
              merchantVibe?.created_at.toLocaleDateString("ar-SA", {
                month: "short",
                day: "numeric",
              }),
          };
        })
      );

      // --uncomment below line if in future , want to show only the default language records --
      // const filteredtags = localizedvibes.filter(merchantVibe => merchantVibe !== null);

      return response.send(
        1,
        STATUS_CODE.OK,
        "vibes",
        localizedvibes,
        res,
        null
      );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching merchants vibe : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/web-app/merchant/get-detail/${req?.params?.merchantId}`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch merchants vibe",
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
 *   name: Web-Merchant
 *   description: APIs for merchant operations
 */

/**
 * @swagger
 * /v1/web-app/merchant/vibe/get-all/{merchantId}:
 *   get:
 *     tags: [Web-Merchant]
 *     summary: Get all merchant vibes for a specific merchant
 *     description: Retrieves all active vibes for a specified merchant that are not marked as deleted and have not expired. Includes information about whether the customer has seen or liked each vibe, along with optional localization for images based on the user's default language.
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         description: The ID of the merchant whose vibes are to be retrieved
 *         schema:
 *           type: string
 *           example: "607c191e810c19729de860ea"  # Example merchant ID
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
 *                       _id:
 *                         type: string
 *                         example: "607c191e810c19729de860eb"  # Example vibe ID
 *                       merchant_id:
 *                         type: string
 *                         example: "607c191e810c19729de860ea"  # Example merchant ID
 *                       image:
 *                         type: string
 *                         example: "https://example.com/vibe_image.png"  # Example vibe image URL
 *                       is_seen:
 *                         type: boolean
 *                         example: false  # Indicates if the customer has seen the vibe
 *                       is_liked:
 *                         type: boolean
 *                         example: true  # Indicates if the customer has liked the vibe
 *                       formatted_createdAt_day:
 *                         type: string
 *                         example: "Monday"  # Formatted day of creation
 *                       formatted_createdAt_month:
 *                         type: string
 *                         example: "Sep 25"  # Formatted month and day of creation
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
