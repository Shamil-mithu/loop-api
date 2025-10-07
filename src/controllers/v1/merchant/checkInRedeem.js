"use strict";

const { verifyAuth, validate } = require("@src/middlewares");
const { response, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const {
    Models: {
        VendorCustomerSession,
        FoodicsReward,
        Currency
    },
    Constants: {
        STATUS_CODE,
        ERROR,
        LOG_TYPE,
        HTTP_VERBS,
        VENDOR_CUSTOMER_SESSION_STATUS,
        S3_UPLOAD_FOLDER,

    },
} = require("@mithu/models-constants");
const socket = require('@root/socket');

const { foodics, generateUniqueVendorSessionRequestedNumber } = require("@src/utils");
const { Merchant } = require("@root/src/models");
// ------------------------- Controller -------------------------

const CONTROLLER = [
    verifyAuth(),
    validate({
        body: Joi.object().keys({
            merchant_id: Joi.string().required(),
            amount: Joi.number().required(),
        }),
    }),
    async function checkInRedeemV1Controller(req, res) {
        try {
            let { merchant_id, amount } = req.body;
            const { customer } = req;
            if (amount > 0) {
                const previousActiveRedemptionSession = await VendorCustomerSession.findOne({
                    customer_id: customer.id,
                    status: VENDOR_CUSTOMER_SESSION_STATUS.ACTIVE,
                    amount: { $gt: 0 }
                })
                if (previousActiveRedemptionSession) {
                    previousActiveRedemptionSession.status = VENDOR_CUSTOMER_SESSION_STATUS.INACTIVE,
                    await previousActiveRedemptionSession.save()
                    // return response.send(
                    //     0,
                    //     STATUS_CODE.BAD_REQUEST,
                    //     "You have already an active redemption session. Please ask the merchant to end the session or contact customer support.",
                    //     null,
                    //     res,
                    //     null
                    // );
                }
            }

            const merchant = await Merchant.findById(merchant_id);
            const currency = await Currency.findOne({
                code: merchant.currency,
                $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
            });
            if (!currency) {
                return response.send(
                    0,
                    STATUS_CODE.NOT_FOUND,
                    "Merchant Currency not found",
                    null,
                    res,
                    null
                );
            }
            const pointRate = currency.point_rate;
            const uniqueSessionRequestedNumber = await generateUniqueVendorSessionRequestedNumber()
            const vendorCustomerSession = await VendorCustomerSession.create({
                customer_id: customer.id,
                device_id: null,
                allow_redeem: true,
                status: VENDOR_CUSTOMER_SESSION_STATUS.ACTIVE,
                amount: amount,
                coin_amount: (amount / pointRate).toFixed(2),
                merchant_id: merchant_id,
                expires_at: Date.now() + 60000,
                requested_number: uniqueSessionRequestedNumber
            })
            //
            const isUnUsedExist = await FoodicsReward.findOne({
                is_used: false,
                customer_id: customer.id,
            });
            let uniqueRewardCode = null;
            if (!isUnUsedExist) {
                uniqueRewardCode = await foodics.generateUniqueRewardCode();
                const [redeemQRbase64, rewardQRbase64] = await Promise.all([
                    foodics.generateQrCode(
                        `{"customer_name":"${customer.name}","customer_mobile_number":"${customer.phone_number.number
                        }","mobile_country_code":${customer.phone_number.code.replace(
                            /[^0-9]/g,
                            ""
                        )},"reward_code":"${uniqueRewardCode}"}`
                    ),
                    foodics.generateQrCode(
                        `{"customer_name":"${customer.name}","customer_mobile_number":"${customer.phone_number.number
                        }","mobile_country_code":${customer.phone_number.code.replace(/[^0-9]/g, "")}}`
                    ),
                ]);

                if (redeemQRbase64 && rewardQRbase64) {
                    const [redeemQrCodeUrl, rewardQrCodeUrl] = await Promise.all([
                        foodics.uploadQrCodeToS3(
                            redeemQRbase64,
                            customer.id,
                            S3_UPLOAD_FOLDER.FOODICS
                        ),
                        foodics.uploadQrCodeToS3(
                            rewardQRbase64,
                            customer.id,
                            S3_UPLOAD_FOLDER.FOODICS
                        ),
                    ]);
                    const newFoodicsReward = await FoodicsReward.create({
                        customer_id: customer.id,
                        is_used: false,
                        reward_url: rewardQrCodeUrl,
                        redeem_url: redeemQrCodeUrl,
                        reward_code: uniqueRewardCode,
                        used_at: null,
                    });
                }
            }
            socket.emit('device_sessions_updated')
            const data = {
                merchant_name: merchant.name
            }
            return response.send(
                1,
                STATUS_CODE.OK,
                "new redeem sesssion activated",
                data,
                res,
                null
            );
        } catch (error) {
            console.error(error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception while setting check in redeem: ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                "/v1/merchant/check-in/redeem",
                HTTP_VERBS.POST,
                req?.merchant?.id || null
            );
            return response.send(
                0,
                STATUS_CODE.INTERNAL_SERVER_ERROR,
                "Couldn't set customer device allow redeem status:",
                null,
                res,
                error
            );
        }
    },
];

module.exports = CONTROLLER;


/**
 * @swagger
 * tags:
 *   name: Merchant
 *   description: APIs for Merchant operations
 */

/**
 * @swagger
 * /v1/merchant/check-in/redeem:
 *   post:
 *     tags: [Merchant]
 *     summary: redeem through app
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               merchant_id:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       '200':
 *         description: customer's info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: customers list
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_documents:
 *                       type: integer
 *                       example: 50
 *                     customers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 60c72b2f9f1b2c001c8e4f0a
 *                           name:
 *                             type: string
 *                             example: John Doe
 *                           email:
 *                             type: string
 *                             example: john.doe@example.com
 *                           phone_number:
 *                             type: string
 *                             example: +1234567890
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-06-13T12:34:56.789Z
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2024-06-13T12:34:56.789Z
 *       '400':
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 code:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: Invalid input
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 code:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
