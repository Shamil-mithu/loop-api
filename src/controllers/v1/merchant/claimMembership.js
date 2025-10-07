"use strict";

const { Joi, S3 } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  ARABIC_RESPONSES,
  RESPONSE_ACTION,
  S3_UPLOAD_FOLDER,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const path = require("path");
const svg2img = require("svg2img");
const { firebase, claimMembershipForAUser } = require("@src/utils");
const { SystemLocalization } = require("@src/models");
const { registerFont } = require("canvas");
const fontPath = path.join(__dirname, "../../../../public/assets/fonts");

registerFont(path.join(fontPath, "manrope-bold.otf"), {
  family: "ManropeBold",
});
registerFont(path.join(fontPath, "manrope-extrabold.otf"), {
  family: "ManropeExtraBold",
});
registerFont(path.join(fontPath, "manrope-semibold.otf"), {
  family: "ManropeSemiBold",
});
registerFont(path.join(fontPath, "manrope-light.otf"), {
  family: "ManropeLight",
});
registerFont(path.join(fontPath, "manrope-medium.otf"), {
  family: "ManropeMedium",
});
registerFont(path.join(fontPath, "manrope-regular.otf"), {
  family: "ManropeRegular",
});
registerFont(path.join(fontPath, "manrope-thin.otf"), {
  family: "ManropeThin",
});

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      storeLoyalty_id: Joi.string().required(),
    }),
  }),
  async function getMerchantDetailV1Controller(req, res) {
    try {
      const {
        customer,
        body: { storeLoyalty_id },
      } = req;

      const data = claimMembershipForAUser(
        customer,
        storeLoyalty_id,
        "backend"
      );
      const sys_localization = await SystemLocalization.findOne({
        eid: customer.default_language,
        key: `${customer.default_language}_response_${RESPONSE_ACTION.NFT_MINTED}`,
        lang_id: customer.default_language,
      });

      const responseMessage =
        customer.default_language == req.default_language || !sys_localization
          ? "NFT minted"
          : sys_localization.value;
      return response.send(1, STATUS_CODE.OK, responseMessage, data, res, null);
    } catch (error) {
      // console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while claiming membership : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/merchant/claim-membership",
        HTTP_VERBS.POST,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't claim membership",
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
 * /v1/merchant/claim-membership:
 *   post:
 *     tags: [Merchant]
 *     summary: Get details of a specific merchant
  *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeLoyalty_id:
 *                 type: string
 *                 description: storeLoyalty id 
 *                 example: 123456789765
 *     responses:
 *       '200':
 *         description: Merchant details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: Membership ID
 *                 name:
 *                   type: string
 *                   description: Membership name
 *                 card_number:
 *                   type: string
 *                   description: Membership card number
 *                 symbol:
 *                   type: string
 *                   description: NFT symbol
 *                 token_uri:
 *                   type: string
 *                   description: NFT token URI
 *                 contract_address:
 *                   type: string
 *                   description: NFT contract address
 *                 owner_address:
 *                   type: string
 *                   description: NFT owner address
 *                 tx_ids:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Transaction IDs
 *                 fee:
 *                   type: string
 *                   description: NFT fee
 *                 minted_address:
 *                   type: string
 *                   description: Minted address
 *                 nft_id:
 *                   type: string
 *                   description: NFT ID
 *                 customer_id:
 *                   type: string
 *                   description: Customer ID
 *                 merchant_id:
 *                   type: string
 *                   description: Merchant ID
 *                 storeLoyalty_id:
 *                   type: string
 *                   description: Store Loyalty ID
 *                 created_at:
 *                   type: string
 *                   description: Created at timestamp
 *                 updated_at:
 *                   type: string
 *                   description: Updated at timestamp
 *                 __v:
 *                   type: integer
 *                   description: Version key
 *       '404':
 *         description: Merchant not found
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
 *                   example: Merchant not found
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
 *                   example: Could not process the request
 */