"use strict";

const { ManualReceipt, SystemLocalization, Merchant, Customer,
    Currency,
    TransactionSource,
    CustomerTransaction,
    CustomerBalance,
} = require("@src/models");

const { Joi, S3 } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
    STATUS_CODE,
    S3_ACL,
    S3_UPLOAD_FOLDER,
    ARABIC_RESPONSES,
    RESPONSE_ACTION,
    MANUAL_RECEIPT_STATUS,
    MANUAL_RECEIPT_TYPE,
    LOG_TYPE,
    COLLECTION,
    HTTP_VERBS,
    MODEL,
    ACTIVITY_ACTION_TYPE,
    TRANSACTION_SOURCE_NAME,
    TRANSACTION_SOURCE_TYPE,
    TRANSACTION_TYPE,
    TRANSACTION_STATUS,
    MERCHANT_TYPE,
} = require("@src/constants");
const {
    response,
    getFileInfoFromBase64: { getFileInfoFromBase64 },
    insertMessageLog, generateUniqueManualReceiptNumber
} = require("@src/utils");
const { S3_ENDPOINT, S3_CDN_URL, S3_BUCKET } = require("@src/config");
const { S3Error } = require("@src/errors");
const moment = require("moment");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
    verifyAuth(),
    bodyParser.json(),
    validate({
        body: Joi.object().keys({
            merchant_id: Joi.string().objectId().required(),
            date: Joi.date().required(),
            attachment: Joi.string().required(),
        }),
    }),
    async function createManualReceipt(req, res) {
        try {
            const {
                customer,
                body: { date, merchant_id, attachment },
            } = req;

            const isMerchant = await Merchant.findOne({
                _id: merchant_id
            })
            if (!isMerchant) {
                return response.send(0, STATUS_CODE.CONFLICT, 'no merchant with this merchant id', null, res, 'no merchant with this merchant id')
            }

            let attachmentUrl = "";

            if (attachment.length > 0) {
                const fileInfo = getFileInfoFromBase64(attachment);
                const base64Data = attachment.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                const { fileExtension, mimeType } = fileInfo;

                const folder = S3_UPLOAD_FOLDER.MANUAL_RECEIPT;
                const metadata = { customer: customer.id };

                const transformedBuffer = await S3.prepareForS3Upload(buffer);
                const filePath = await S3.upload(
                    `${folder}`,
                    fileExtension,
                    mimeType,
                    transformedBuffer,
                    S3_ACL.PUBLIC,
                    metadata
                );

                attachmentUrl = `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
            }
            const unique_number = await generateUniqueManualReceiptNumber()
            let manual_receipt = await ManualReceipt.create({
                customer_id: customer?.id,
                image: attachmentUrl,
                merchant_id,
                date,
                unique_number,
            });
            if (!manual_receipt) {
                const sys_localization = await SystemLocalization.findOne({
                    eid: customer.default_language,
                    key: `${customer.default_language}_response_${RESPONSE_ACTION.COULD_NOT_UPLOAD_MANUAL_RECEIPT}`,
                    lang_id: customer.default_language,
                });

                const responseMessage =
                    customer.default_language == req.default_language || !sys_localization
                        ? "could not create manual_receipt"
                        : sys_localization.value;
                return response.send(
                    0,
                    STATUS_CODE.SERVICE_UNAVAILABLE,
                    responseMessage,
                    null,
                    res,
                    null
                );
            }
            manual_receipt = {
                ...manual_receipt._doc,
                created_at: manual_receipt.created_at.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                id : manual_receipt.id
                }),
                time: moment(manual_receipt.created_at).format("hh:mm A"),
            };
            const sys_localization = await SystemLocalization.findOne({
                eid: customer.default_language,
                key: `${customer.default_language}_response_${RESPONSE_ACTION.MANUAL_RECEIPT_UPLOADED}`,
                lang_id: customer.default_language,
            });
            const responseMessage =
                customer.default_language == req.default_language || !sys_localization
                    ? "manual_receipt uploaded successfully"
                    : sys_localization.value;
            const currency = await Currency.findOne({
                code: "SAR",
            });
           
            const mithuMerchant = await Merchant.findOne({
                type: MERCHANT_TYPE.INTERNAL,
            });
            const networkTransactionSource = await TransactionSource.findOne({
                name: TRANSACTION_SOURCE_NAME.MANUAL_RECEIPT_POINTS,
                earning_type: TRANSACTION_TYPE.NETWORK,
            });

            await CustomerTransaction.create({
                entity_id: merchant_id,
                entity_type: COLLECTION.MERCHANT,
                customer_id: customer.id,
                reference_id: manual_receipt._id,
                reference_type: COLLECTION.MANUAL_RECEIPT,
                points: 0,
                points_type: TRANSACTION_TYPE.NETWORK,
                transaction_source_id: networkTransactionSource.id,
                transaction_type: TRANSACTION_SOURCE_TYPE.EARNING,
                status: TRANSACTION_STATUS.PENDING
            });


            return response.send(
                1,
                STATUS_CODE.OK,
                responseMessage,
                manual_receipt,
                res,
                null
            );
        } catch (error) {
            console.log(error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception while uploading manual_receipt : ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                "/v1/manual_receipt/upload",
                HTTP_VERBS.POST,
                req?.customer?.id || null
            );
            if (error instanceof S3Error) {
                response.send(
                    0,
                    error.status_code,
                    "Couldn't upload manual_receipt",
                    null,
                    res,
                    error.details
                );
            } else {
                response.send(
                    0,
                    STATUS_CODE.INTERNAL_SERVER_ERROR,
                    "Couldn't upload manual_receipt",
                    null,
                    res,
                    error
                );
            }
        }
    },
];


// -----------------------------------------EXPORTS---------------------------------------------------------
module.exports = CONTROLLER;



/**
 * @swagger
 * tags:
 *   name: ManualReceipt
 *   description: APIs for ManualReceipt operations
 */

/**
 * @swagger
 * /v1/manual-receipt/upload:
 *   post:
 *     tags: [ManualReceipt]
 *     summary: Create a new  manual_receipt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               merchant_id:
 *                 type: string
 *                 example: 664dd5f9ffe0ca132fca3f0a
 *                 description: merchant id 
 *               date:
 *                 type: date
 *                 example: 2025-01-12T13:57:46.026+00:00
 *                 description: date of receipt
 *               attachment:
 *                 type: string
 *                 example: data:image/png;base64,iVBORw0K...  # Example of a valid base64 string
 *                 description: Base64 encoded image string (optional)
 *     responses:
 *       '201':
 *         description: ManualReceipt created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: ManualReceipt created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 60d5ec49f892d61180b5c9d4
 *                     user_id:
 *                       type: string
 *                       example: 60d5ec49f892d61180b5c9d4
 *                     type:
 *                       type: string
 *                       example: technical
 *                     ticket_status:
 *                       type: string
 *                       example: open
 *                     title:
 *                       type: string
 *                       example: Issue accessing my account
 *                     description:
 *                       type: string
 *                       example: I have been unable to access my account for the past week.
 *                     attachment:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: ["https://s3.amazonaws.com/bucket/file1.png"]
 *                     ticket_number:
 *                       type: string
 *                       example: '#TICKET-00123'
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-05-21T15:23:42.389Z
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-05-21T15:23:42.389Z
 *       '400':
 *         description: Invalid input data
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
 *                   example: Invalid support type
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
 *                   example: Could not create manual_receipt
 */
