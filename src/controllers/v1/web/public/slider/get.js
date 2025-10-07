"use strict";

const { Slider, Country } = require("@src/models");
const { validate } = require("@src/middlewares");
const { Joi } = require("@src/lib");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  SLIDER_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
  MOBILE_TYPE
} = require("@src/constants");
const { response, insertMessageLog, getCountryFromLatLong } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  validate({
    query: Joi.object().keys({
      country: Joi.string().required().default("Saudi Arabia")
    }),
  }),
  async function getAllSliderV1Controller(req, res) {
    try {
      // const latitude = req?.body?.latitude || 31.5204; // DEAFAULT TO lAHORE
      // const longitude = req?.body?.longitude || 74.3587;
      // const country = await getCountryFromLatLong(latitude, longitude);

      const country = await Country.findOne({
        name: req?.query?.country || "Saudi Arabia",
      })

      const sliders = await Slider.find({
        deleted_at: { $exists: false },
        status: SLIDER_STATUS.ACTIVE,
        mobile_type: { $in: [req?.mobile_type, MOBILE_TYPE.BOTH] },
        country_id: { $in: [null, country._id] }//find the slider based on the country plus the default slider
      });

      return response.send(1, STATUS_CODE.OK, "Sliders", sliders, res, null);


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
        "/v1/web-app/slider/get-all",
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
 *   name: Web-Slider
 *   description: APIs for Slider operations
 */

/**
 * @swagger
 * /v1/web-app/slider/get-all:
 *   get:
 *     tags: [Web-Slider]
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
