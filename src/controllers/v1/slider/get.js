"use strict";

const { Slider, Language, SystemLocalization, Country } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  SLIDER_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
  MOBILE_TYPE
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getAllSliderV1Controller(req, res) {
    try {
      const { customer } = req;
      const country = await Country.findOne({
        dial_code: customer?.phone_number.code,
      })

      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      const sliders = await Slider.find({
        deleted_at: { $exists: false },
        status: SLIDER_STATUS.ACTIVE,
        mobile_type: { $in: [req?.mobile_type, MOBILE_TYPE.BOTH] },
        country_id: { $in: [null, country._id] }//find the slider based on the country plus the default slider
      });
      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();
      if (customerLangId === defaultLangId) {
        return response.send(1, STATUS_CODE.OK, "Sliders", sliders, res, null);
      }

      const localizedSliders = await Promise.all(
        sliders.map(async (slider) => {
          const sysTitle = await SystemLocalization.findOne({
            eid: slider._id.toString(),
            key: `${slider._id}_slider_title`,
            lang_id: customer.default_language,
          });
          const sysImage = await SystemLocalization.findOne({
            eid: slider._id.toString(),
            key: `${slider._id}_slider_image`,
            lang_id: customer.default_language,
          });
          console.log(sysTitle, sysImage);

          if (sysTitle || sysImage) {
            slider.title = sysTitle?.value ?? slider.title;
            slider.image = sysImage?.value ?? slider.image;

            return slider;
          }
          return slider;
        })
      );

      // --uncomment below line if in future , if want to show only the default language records --
      // const filteredsliders = localizedSliders.filter(slider => slider !== null);

      return response.send(
        1,
        STATUS_CODE.OK,
        "sliders",
        localizedSliders,
        res,
        null
      );
    } catch (error) {
      console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching sliders : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/slider/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch sliders",
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
 *   name: Slider
 *   description: APIs for Slider operations
 */

/**
 * @swagger
 * /v1/slider/get-all:
 *   get:
 *     tags: [Slider]
 *     summary: Get all sliders
 *     responses:
 *       '200':
 *         description: List of sliders
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
 *                   example: Sliders fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         example: Free Shipping on Orders Over $50
 *                       image:
 *                         type: string
 *                         example: https://example.com/image1.jpg
 *                       status:
 *                         type: string
 *                         example: active
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         example: 2024-01-01T00:00:00.000Z
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         example: 2024-12-31T23:59:59.999Z
 *                       action_url:
 *                         type: string
 *                         example: https://example.com/shop-now
 *                       merchant_id:
 *                         type: string
 *                         example: 60d5ec49f892d61180b5c9d4
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
 *                   example: Could not fetch sliders
 */
