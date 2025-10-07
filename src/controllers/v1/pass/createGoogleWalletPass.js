"use strict";

const { GoogleWalletPass } = require("@src/models");
const { verifyAuth } = require("@src/middlewares");
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
const { WalletPassHelper, generateUniqueWalletPassSerialNumber } = require('@src/utils');
const { walletService } = require('@src/services/google-wallet/walletServiceInstance');


// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
    verifyAuth(),
    bodyParser.json(),
    bodyParser.urlencoded({ extended: true }),
    async function createGoogleWalletPassV1Controller(req, res) {
        try {
            let {
                customer,
            } = req;
            const isPassExists = await GoogleWalletPass.findOne({
                customer_id: customer._id,
                is_registered: true,
                is_deleted: false,
            });
            if (isPassExists) {
                return response.send(
                    0,
                    STATUS_CODE.BAD_REQUEST,
                    "loyalty pass already exists",
                    null,
                    res,
                    "loyalty pass already exists"
                );
            }
            const userPassData = await WalletPassHelper.calculateCustomerDataForWalletPass(customer);
            const classId = await WalletPassHelper.getClassIdFromSettings() // fetch classID from settings table or config
           
            const result = await walletService.createCompletePass(userPassData, classId);
            if (!result || !result.passObject) {
                return response.send(
                    0,
                    STATUS_CODE.BAD_REQUEST,
                    "couldn't create an apple wallet pass",
                    null,
                    res,
                    "couldn't create an apple wallet pass"
                );
            }
            const serial_number = await generateUniqueWalletPassSerialNumber()
            const pass = await GoogleWalletPass.create({
                customer_id: customer._id,
                pass_url: result.saveUrl,
                serial_number: serial_number,
                object_id: result.passObject.id,
                class_id: classId,
                is_active: true,
                last_updated_from_server: new Date(),
                callback_url: result?.callbackUrl,
                token: result.token
            });
            return response.send(1, STATUS_CODE.OK, 'pass has been created successfully', { passUrl: pass.pass_url }, res, null);

        } catch (error) {
            console.log(error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception while creating google wallet pass : ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                `/v1/pass/google-wallet`,
                HTTP_VERBS.POST,
                req?.customer?.id || null
            );
            response.send(
                0,
                STATUS_CODE.INTERNAL_SERVER_ERROR,
                "couldn't create an google wallet pass",
                null,
                res,
                error
            );
        }
    },
];

module.exports = CONTROLLER


/**
 * @swagger
 * tags:
 *   name: Pass
 *   description: APIs for rating operations
 */

/**
 * @swagger
 * /v1/pass/google-wallet:
 *   post:
 *     tags: [Pass]
 *     summary: Create a new rating for a specific merchant
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
