"use strict";

const { Customer } = require("@src/models");
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
    body: Joi.object()
      .keys({
        terms_and_conditions_consent: Joi.boolean().invalid(false).required(),
        privacy_policy_consent: Joi.boolean().invalid(false).required(),
      })
      .required(),
  }),
  async function acceptTermsAndConditionV1Controller(req, res) {
    try {
      const {
        customer,
        body: { terms_and_conditions_consent, privacy_policy_consent },
      } = req;

      await Customer.updateOne(
        {
          _id: customer.id,
        },
        {
          terms_and_conditions_consent,
          privacy_policy_consent,
        }
      );
      return response.send(
        1,
        STATUS_CODE.OK,
        "Terms and conditions submitted",
        customer,
        res,
        null
      );
    } catch (error) {
      // console.log(error.essage ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while submitting Terms and conditions : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer/accept-terms-and-conditions",
        HTTP_VERBS.POST,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't submit Terms and conditions ",
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
 *   name: Customer
 *   description: APIs for customer operations
 */

/**
 * @swagger
 * /v1/customer/accept-terms-and-conditions:
 *   post:
 *     tags: [Customer]
 *     summary: Submit terms and conditions
 *     description: Allows a customer to submit their consent for terms and conditions and privacy policy.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               terms_and_conditions_consent:
 *                 type: boolean
 *                 description: Indicates whether the customer accepts the terms and conditions
 *                 example: true
 *               privacy_policy_consent:
 *                 type: boolean
 *                 description: Indicates whether the customer accepts the privacy policy
 *                 example: true
 *             required:
 *               - terms_and_conditions_consent
 *               - privacy_policy_consent
 *     responses:
 *       200:
 *         description: Terms and conditions submitted successfully
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
 *                   example: Terms and conditions submitted
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 609c82b06f4f098a83b91be3
 *                     terms_and_conditions_consent:
 *                       type: boolean
 *                       example: true
 *                     privacy_policy_consent:
 *                       type: boolean
 *                       example: true
 *                     status:
 *                       type: string
 *                       example: VERIFIED
 *       400:
 *         description: Bad request - Missing or invalid fields
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
 *                   example: Invalid request body
 *       500:
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
 *                   example: Could not process terms and conditions request
 */
