"use strict";

const { CustomerBalance, Brand, Order, AppleWalletPass, Customer } = require("@src/models");
const { verifyAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
    STATUS_CODE,
    S3_ACL,
    S3_UPLOAD_FOLDER,
    ORDER_STATUS,
    LOG_TYPE,
    HTTP_VERBS,
} = require("@src/constants");
const {
    response,
    insertMessageLog,
} = require("@src/utils");
const { S3 } = require("@src/lib");
const { S3_CDN_URL, S3_BUCKET } = require("@src/config");
const { S3Error } = require("@src/errors");
const { Apple } = require("@src/services");
const { formatCount } = require('@src/utils')

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
    bodyParser.json(),
    bodyParser.urlencoded({ extended: true }),
    async function registerWalletPassV1Controller(req, res) {
        try {
        
            if (!req.headers.authorization) {
                return res.status(401).send('Unauthorized, No auth token provided');
            }

            let {
                deviceLibraryIdentifier,
                passTypeIdentifier,
                serialNumber
            } = req.params;
            const { pushToken } = req.body;

            const findPass = await AppleWalletPass.findOne({
                serial_number: serialNumber,
                pass_type_identifier: passTypeIdentifier,
                is_deleted: false,
            })

            if (!findPass) {
                return res.status(401).send('Unauthorized, pass not found using this serial number');
            }

            const authToken = req.headers.authorization?.replace('ApplePass ', '');

            if (authToken !== findPass?.authentication_token) {
                return res.status(401).send('Unauthorized');
            }


            findPass.device_library_identifier = deviceLibraryIdentifier;
            findPass.push_token = pushToken;
            findPass.pass_type_identifier = passTypeIdentifier;
            findPass.is_registered = true;
            await findPass.save();
            const customer = await Customer.findOneAndUpdate(
                { _id: findPass.customer_id },
                { $set: { apple_pass_push_token: pushToken } },
                { new: true }
            );

            console.log(`REGISTER API HAS BEEN HIT for serial number ${serialNumber}`)
            return response.send(1, STATUS_CODE.OK, 'pass has been registered successfully', null, res, null);

        } catch (error) {
            console.log(error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception while registering an apple wallet pass : ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                `/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`,
                HTTP_VERBS.POST,
                req?.customer?.id || null
            );
            if (error instanceof S3Error) {
                response.send(
                    0,
                    error.status_code,
                    "couldn't register an apple wallet pass",
                    null,
                    res,
                    error.details
                );
            } else {
                response.send(
                    0,
                    STATUS_CODE.INTERNAL_SERVER_ERROR,
                    "couldn't register an apple wallet pass",
                    null,
                    res,
                    error
                );
            }
        }
    },
];

module.exports = CONTROLLER


/**
 * @swagger
 * tags:
 *   name: Webhook/WalletPass/Apple
 *   description: APIs for rating operations
 */

/**
 * @swagger
 * /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}:
 *   post:
 *     tags: [Webhook/WalletPass/Apple]
 *     summary: Registers the wallet Pass
 *     parameters:
 *       - in: path
 *         name: deviceLibraryIdentifier
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: passTypeIdentifier
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: serialNumber
 *         required: true
 *         schema:
 *           type: string
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
