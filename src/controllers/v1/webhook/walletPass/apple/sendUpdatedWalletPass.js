"use strict";

const { CustomerBalance, Brand, Order, AppleWalletPass, Customer, Currency } = require("@src/models");
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
    async function sendUpdatedAppleWalletPassV1Controller(req, res) {
        try {

            let {
                serialNumber,
                passTypeIdentifier
            } = req.params;

            let findPass = await AppleWalletPass.findOne({
                pass_type_identifier: passTypeIdentifier,
                serial_number: serialNumber
            }).populate('customer_id', 'name email phone_number _id')

            if (!findPass) {
                return res.status(401).send('Unauthorized, pass not found using this serial number');
            }

            let customer = await Customer.findOne({
                _id: findPass.customer_id._id
            }).select('name email phone_number _id created_at default_currency');
            if (!customer) {
                return res.status(401).send('Unauthorized, customer not found using this serial number');
            }

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
            const defaultCurrency = await Currency.findOne({
                _id: customer.default_currency
            })
            const point_to_cash =
                formatCount((customerBalance?.balance || 0) * defaultCurrency.point_rate);
            const customerPoints = formatCount(customerBalance?.balance ?? 0);
            const customerObj = {
                name: customer.name,
                points: customerPoints,
                orderCount: customerOrderCount,
                created_at: customer.created_at,
                default_currency_symbol: defaultCurrency?.code,
                points_to_cash: point_to_cash,
                ...customer.toObject(),
            }
            const existingPass = {
                ...findPass._doc,
                relevantText: "Your Pass has been Updated !",
                relevantDate: new Date(Date.now() + 60 * 1000).toLocaleString('sv', { timeZone: 'Asia/Karachi' }).replace(' ', 'T') + '+05:00'
            }
            const { buffer } = await Apple.createAppleWalletPassService(
                customerObj, existingPass
            );

            const filePath = await S3.upload(
                `${S3_UPLOAD_FOLDER.WALLET_PASSES}/${customer._id}`,
                "pkpass",
                "application/vnd.apple.pkpass",
                buffer,
                S3_ACL.PUBLIC,
                { customer: customer.id }
            );
            const passUrl = `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
            findPass.pass_url = passUrl
            findPass.last_updated_from_server = new Date()
            await findPass.save()

            res.set({
                'Content-Type': 'application/vnd.apple.pkpass',
                'Content-Disposition': 'attachment; filename=loyalty.pkpass'
            });
            res.send(buffer);

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
