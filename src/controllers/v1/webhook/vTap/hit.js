"use strict";

const { WebhookDump } = require("@src/models");
const bodyParser = require("body-parser");
const {
    STATUS_CODE,
    LOG_TYPE,
    HTTP_VERBS,
} = require("@src/constants");
const {
    response,
    insertMessageLog,
} = require("@src/utils");
const { formatCount } = require('@src/utils')

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
    bodyParser.json(),
    bodyParser.urlencoded({ extended: true }),
    async function registerWalletPassV1Controller(req, res) {
        try {
            console.log("Received vTap webhook request:", req.body);
            const { body } = req;
            await WebhookDump.create({
                data : body,
            });

        } catch (error) {
            console.log(error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception while hitting vTap webhook: ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                `/v1/webhook/vtap`,
                HTTP_VERBS.POST,
                req?.customer?.id || null
            );
            response.send(
                0,
                STATUS_CODE.INTERNAL_SERVER_ERROR,
                "couldn't hit VTAP webhook",
                null,
                res,
                error
            );
        }
    }
];

module.exports = CONTROLLER


/**
 * @swagger
 * tags:
 *   name: Webhook
 *   description: APIs for rating operations
 */

/**
 * @swagger
 * /v1/webhook/vtap:
 *   post:
 *     tags: [Webhook]
 *     summary: Registers the wallet Pass
 *     responses:
 *       '200':
 *         description: Rating created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Your feedback has been submitted"
 *                 data:
 *                   type: object
 *                   properties:
 *                     newRating:
 *                       type: object
 *                       properties:
 *                         merchant_id:
 *                           type: string
 *                           example: "merchantId123"
 *                         customer_id:
 *                           type: string
 *                           example: "customerId456"
 *                         message:
 *                           type: string
 *                           example: "Great experience with this merchant!"
 *                         ratings:
 *                           type: integer
 *                           example: 4
 *                         status:
 *                           type: string
 *                           example: "PENDING"
 *                         picture:
 *                           type: string
 *                           example: "https://example.com/path/to/image.jpg"
 *                         is_recommended_by_me:
 *                           type: boolean
 *                           example: true
 *                         most_impressed_feature:
 *                           type: array
 *                           items:
 *                             type: string
 *                             example: ["Quality", "Service"]
 *       '400':
 *         description: Bad request due to validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 status_code:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Validation error"
 *                 error:
 *                   type: object
 *                   properties:
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           message:
 *                             type: string
 *                             example: "Validation failed for field 'rating'"
 *                           path:
 *                             type: array
 *                             items:
 *                               type: string
 *                               example: ["rating"]
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
 *                 status_code:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *                 error:
 *                   type: string
 *                   example: "Error details here"
 */
