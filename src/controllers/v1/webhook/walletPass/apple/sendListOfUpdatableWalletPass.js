"use strict";

const { CustomerBalance, Brand, Order, AppleWalletPass, Customer } = require("@src/models");
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
const { formatCount } = require('@src/utils');


// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
    bodyParser.json(),
    bodyParser.urlencoded({ extended: true }),
    async function listUpdatableAppleWalletPassV1Controller(req, res) {
        try {
            const {
                deviceLibraryIdentifier,
                passTypeIdentifier
            } = req.params;

            const { passesUpdatedSince } = req.query;
            if (!passesUpdatedSince) {
                // return res.status(400).json({
                //     message: "passesUpdatedSince query parameter is required"
                // });
            }

            // Parse query time for comparison
            // const updatedSinceDate = new Date(passesUpdatedSince);

            // Find all matching passes for this device & pass type, updated after given time
            const updatedPasses = await AppleWalletPass.find({
                pass_type_identifier: passTypeIdentifier,
                device_library_identifier: deviceLibraryIdentifier,
                // updated_at: { $gt: updatedSinceDate }
            }).select('serial_number updated_at').sort({ updated_at: -1 });

            if (!updatedPasses.length) {
                return res.status(204).send(); // No updated passes
            }

            // Extract serial numbers and get the latest updated time
            const serialNumbers = updatedPasses.map(pass => pass.serial_number);
            const lastUpdated = updatedPasses[0].updated_at.toISOString();
          
            return res.status(200).json({
                lastUpdated,
                serialNumbers
            });

        } catch (error) {
            console.error("Error in listUpdatableAppleWalletPassV1Controller:", error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception while fetching updatable Apple Wallet passes: ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                `/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier`,
                HTTP_VERBS.GET,
                req?.customer?.id || null
            );
            return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({
                message: "Couldn't fetch updatable Apple Wallet passes",
                error: error.message
            });
        }
    }
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
 * /v1/pass/apple-wallet:
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
