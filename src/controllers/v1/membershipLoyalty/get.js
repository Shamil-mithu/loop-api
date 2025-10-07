"use strict";

const { MembershipClaim, Language, SystemLocalization, VendorCustomerSession, Device } = require("@src/models");
const { verifyAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getAllStoreLoyaltiesV1Controller(req, res) {
    try {
      const { customer } = req;

      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      const claimedLoyalties = await MembershipClaim.find({
        deleted_at: { $exists: false },
        customer_id: customer.id,
      }).populate("storeLoyalty_id");

      const customerLangId = customer?.default_language?.toString();
      const defaultLangId = defaultSystemLang._id.toString();

      const localizedLoyalities = await Promise.all(
        claimedLoyalties.map(async (entity) => {
          // store loyalty localization
          let storeLoyalty = entity.storeLoyalty_id;

          const storeLoyalty_name = await SystemLocalization.findOne({
            eid: storeLoyalty.id.toString(),
            key: `${storeLoyalty._id}_storeLoyalty_name`,
            lang_id: customer.default_language,
          });
          storeLoyalty.name = storeLoyalty_name?.value ?? storeLoyalty.name;

          const storeLoyalty_title = await SystemLocalization.findOne({
            eid: storeLoyalty._id.toString(),
            key: `${storeLoyalty._id}_storeLoyalty_title`,
            lang_id: customer.default_language,
          });
          storeLoyalty.title = storeLoyalty_title?.value ?? storeLoyalty.title;

          const storeLoyalty_sub_title = await SystemLocalization.findOne({
            eid: storeLoyalty._id.toString(),
            key: `${storeLoyalty._id}_storeLoyalty_sub_title`,
            lang_id: customer.default_language,
          });
          storeLoyalty.sub_title =
            storeLoyalty_sub_title?.value ?? storeLoyalty.sub_title;

          const storeLoyalty_description = await SystemLocalization.findOne({
            eid: storeLoyalty._id.toString(),
            key: `${storeLoyalty._id}_storeLoyalty_description`,
            lang_id: customer.default_language,
          });
          storeLoyalty.description =
            storeLoyalty_description?.value ?? storeLoyalty.description;

          const storeLoyalty_background_image =
            await SystemLocalization.findOne({
              eid: storeLoyalty._id.toString(),
              key: `${storeLoyalty._id}_storeLoyalty_background_image`,
              lang_id: customer.default_language,
            });
          storeLoyalty.storeLoyalty_background_image =
            storeLoyalty_background_image?.value ??
            storeLoyalty.background_image;

          // end loyalty localization

          const merchantDevices = await Device.find({
            merchant_id: entity.merchant_id,
          }).select("_id");

          const deviceIds = merchantDevices.map((d) => d._id.toString()); // Ensure proper ID conversion if necessary

          const numberOfSessions = await VendorCustomerSession.countDocuments({
            customer_id: customer._id,
            device_id: { $in: deviceIds },
          });

          const sysName = await SystemLocalization.findOne({
            eid: entity._id.toString(),
            key: `${entity._id}_membershipClaim_name`,
            lang_id: customer.default_language,
          });

          if (sysName) {
            entity.name = sysName.value ?? entity.name;
          }

          return (entity = {
            ...entity._doc,
            number_of_sessions: numberOfSessions,
            storeLoyalty_id: storeLoyalty,
          });
        })
      );

      const data = {
        storeLoyalties: localizedLoyalities,
      };

      return response.send(
        1,
        STATUS_CODE.OK,
        "Store Loyalties",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching storeLoyalities  : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/store-loyalty/get-all",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch storeLoyalities",
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
 *   name: StoreLoyalty
 *   description: APIs for Store Loyalty operations
 */

/**
 * @swagger
 * /v1/store-loyalty/get-all:
 *   get:
 *     tags: [StoreLoyalty]
 *     summary: Get all Store Loyalties of a customer
 *     responses:
 *       '200':
 *         description: List of Store Loyalties
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
 *                   example: Store Loyalties
 *                 data:
 *                   type: object
 *                   properties:
 *                     storeLoyalties:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: 60d5ec49f892d61180b5c9d4
 *                           title:
 *                             type: string
 *                             example: Loyalty Title
 *                           sub_title:
 *                             type: string
 *                             example: Loyalty Subtitle
 *                           background_image:
 *                             type: string
 *                             example: https://example.com/background.jpg
 *                           description:
 *                             type: string
 *                             example: Earn rewards with every purchase!
 *                           name:
 *                             type: string
 *                             example: Gold Membership
 *                           merchant_id:
 *                             type: string
 *                             example: 60d5ec49f892d61180b5c9d5
 *                           color_code:
 *                             type: string
 *                             example: '#FF5733'
 *                           store_loyalty_type:
 *                             type: string
 *                             example: 'TYPE_A'
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-01-01T00:00:00.000Z
 *                           created_by:
 *                             type: string
 *                             example: 60d5ec49f892d61180b5c9d6
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-01-01T00:00:00.000Z
 *                           updated_by:
 *                             type: string
 *                             example: 60d5ec49f892d61180b5c9d7
 *                           deleted_at:
 *                             type: string
 *                             format: date-time
 *                             example: null
 *                           deleted_by:
 *                             type: string
 *                             example: null
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
 *                   example: Could not fetch loyalty cards
 */
