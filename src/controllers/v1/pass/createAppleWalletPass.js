"use strict";

const { CustomerBalance, Brand, Order, AppleWalletPass, Currency } = require("@src/models");
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
const { formatCount } = require('@src/utils');

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
    verifyAuth(),
    bodyParser.json(),
    bodyParser.urlencoded({ extended: true }),
    async function createAppleWalletPassV1Controller(req, res) {
        try {
            let {
                customer,
            } = req;
            const isPassExists = await AppleWalletPass.findOne({
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
            const defaultCurrency = await Currency.findOne({
                _id: customer.default_currency
            })

            const mithuBrand = await Brand.findOne({
                name: "Mithu",
            });
            const customerBalance = await CustomerBalance.findOne({
                customerId: customer._id,
                reference_id: mithuBrand._id,
            })
            const customerOrderCount = await Order.countDocuments({
                customer_id: customer._id,
                status: ORDER_STATUS.CREATED
            })
            const point_to_cash =
              formatCount((customerBalance?.balance || 0) * defaultCurrency.point_rate);
            const customerPoints = formatCount(customerBalance?.balance ?? 0);
            customer = {
                name: customer.name,
                points: customerPoints,
                orderCount: customerOrderCount,
                created_at: customer.created_at,
                default_currency_symbol: defaultCurrency?.code,
                points_to_cash : point_to_cash,
                ...customer.toObject(),
            }
            const { buffer, passJson } = await Apple.createAppleWalletPassService(
                customer
            );
            res.set({
                'Content-Type': 'application/vnd.apple.pkpass',
                'Content-Disposition': 'attachment; filename=loyalty.pkpass'
            });

            const filePath = await S3.upload(
                `${S3_UPLOAD_FOLDER.WALLET_PASSES}/${customer._id}`,
                "pkpass",
                "application/vnd.apple.pkpass",
                buffer,
                S3_ACL.PUBLIC,
                { customer: customer.id }
            );
            const passUrl = `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
            const pass = await AppleWalletPass.create({
                customer_id: customer._id,
                pass_url: passUrl,
                serial_number: passJson.serialNumber,
                team_identifier: passJson.teamIdentifier,
                pass_type_identifier: passJson.passTypeIdentifier,
                is_active: true,
                last_updated_from_server: new Date(),
                webservice_url: passJson.webServiceURL,
                authentication_token: passJson.authenticationToken,
            });
            return response.send(1, STATUS_CODE.OK, 'pass has been created successfully', { passUrl: passUrl }, res, null);

        } catch (error) {
            console.log(error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception while creating an apple wallet pass : ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                `/v1/pass/apple-wallet`,
                HTTP_VERBS.POST,
                req?.customer?.id || null
            );
            if (error instanceof S3Error) {
                response.send(
                    0,
                    error.status_code,
                    "couldn't create an apple wallet pass",
                    null,
                    res,
                    error.details
                );
            } else {
                response.send(
                    0,
                    STATUS_CODE.INTERNAL_SERVER_ERROR,
                    "couldn't create an apple wallet pass",
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
