"use strict";

const { StoreLoyalty, MembershipClaim, Notification, Customer } = require("@src/models");
const { Joi, } = require("@src/lib");
const { publicRepoAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const { STATUS_CODE, LOG_TYPE, HTTP_VERBS } = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { firebase, claimMembershipForAUser } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  publicRepoAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      storeLoyalty_id: Joi.string().hex().length(24),
      customer_id: Joi.string().hex().length(24),
    }),
  }),
  async function claimMembershipV1Controller(req, res) {
    try {
      const {
        body: { storeLoyalty_id, customer_id },
      } = req;
      const customer = await Customer.findById(customer_id);

      const data = await claimMembershipForAUser(customer, storeLoyalty_id);

      return response.send(1, STATUS_CODE.OK, "NFT minted", data, res, null);
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
        "/v1/public/claim-membership",
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
 *   name: Public-Repo-Webhook
 *   description: APIs for merchant operations
 */

/**
 * @swagger
 * /v1/public/claim-membership:
 *   post:
 *     tags: [Public-Repo-Webhook]
 *     summary: Claim a membership and mint an NFT for a customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeLoyalty_id:
 *                 type: string
 *                 description: The unique identifier for the store loyalty program
 *                 example: 605c72b24d1a4c3a0c8b4567
 *               customer_id:
 *                 type: string
 *                 description: The unique identifier for the customer
 *                 example: 605c72b24d1a4c3a0c8b1234
 *     responses:
 *       '200':
 *         description: Successfully minted NFT and returned the token URI
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
 *                   example: NFT minted successfully
 *                 attachment_url:
 *                   type: string
 *                   description: The URI of the minted NFT
 *                   example: https://example.com/nft/123456
 *       '404':
 *         description: Merchant or customer not found
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
 *                   example: Merchant or customer not found
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
