"use strict";

const { verifyAuth, validate } = require("@src/middlewares");
const { response, getFileInfoFromBase64: { getFileInfoFromBase64 }, insertMessageLog } = require('@src/utils')
const QRCode = require('qrcode');
const {
  STATUS_CODE,
  S3_ACL,
  ARABIC_RESPONSES,
  RESPONSE_ACTION,
  S3_UPLOAD_FOLDER,
  ERROR,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { S3_ENDPOINT, S3_CDN_URL, S3_BUCKET } = require("@src/config");
const { Joi, S3 } = require("@src/lib");
const bodyParser = require("body-parser");
const { FoodicsReward, SystemLocalization } = require("@src/models");
const { foodics } = require("@src/utils");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  async function getQrCodeForRedeemV1Controller(req, res) {
    try {
      const { customer } = req;

      if (!customer.secret) {
        return response.send(
          0,
          STATUS_CODE.NOT_ACCEPTABLE,
          "Could not create QR code",
          null,
          res,
          null
        );
      }

      const customerData = {
        customer_name: customer.name,
        customer_mobile_number: customer.phone_number.number,
        mobile_country_code: customer.phone_number.code.replace(/[^0-9]/g, ""),
      };
      let data;
      const isUnUsedExist = await FoodicsReward.findOne({
        is_used: false,
        customer_id: customer.id,
      });
      let uniqueRewardCode = null;
      if (!isUnUsedExist) {
        uniqueRewardCode = await foodics.generateUniqueRewardCode();
        const [redeemQRbase64, rewardQRbase64] = await Promise.all([
          generateQrCode(
            `{"customer_name":"${customer.name}","customer_mobile_number":"${
              customer.phone_number.number
            }","mobile_country_code":${customer.phone_number.code.replace(
              /[^0-9]/g,
              ""
            )},"reward_code":"${uniqueRewardCode}"}`
          ),
          generateQrCode(
            `{"customer_name":"${customer.name}","customer_mobile_number":"${
              customer.phone_number.number
            }","mobile_country_code":${customer.phone_number.code.replace(
              /[^0-9]/g,
              ""
            )}}`
          ),
        ]);

        if (redeemQRbase64 && rewardQRbase64) {
          const [redeemQrCodeUrl, rewardQrCodeUrl] = await Promise.all([
            uploadQrCodeToS3(
              redeemQRbase64,
              customer.id,
              S3_UPLOAD_FOLDER.FOODICS
            ),
            uploadQrCodeToS3(
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
          if (!newFoodicsReward) {
            const responseLocalization = await SystemLocalization.findOne({
              lang_id: customer.default_language,
              key: `${customer.default_language}_response_${RESPONSE_ACTION.COULD_NOT_CREATE_FOODICS_RECORD}`, // langId_response_action
              eid: customer.default_language,
            });
            const responseMessage =
              customer.default_language == req.default_language ||
              !responseLocalization
                ? "could not create foodics record"
                : responseLocalization.value;
            return response.send(
              1,
              STATUS_CODE.INTERNAL_SERVER_ERROR,
              responseMessage,
              null,
              res,
              ERROR.INTERNAL_SERVER_ERROR
            );
          }
          data = {
            redeem_url: redeemQrCodeUrl,
            reward_url: rewardQrCodeUrl,
            reward_code: uniqueRewardCode,
          };
        } else {
          const responseLocalization = await SystemLocalization.findOne({
            lang_id: customer.default_language,
            key: `${customer.default_language}_response_${RESPONSE_ACTION.COULD_NOT_CREATE_QRCODE}`, // langId_response_action
            eid: customer.default_language,
          });

          const responseMessage =
            customer.default_language == req.default_language ||
            !responseLocalization
              ? "Could not create QR code"
              : responseLocalization.value;
          return response.send(
            1,
            STATUS_CODE.FAILED_DEPENDENCY,
            responseMessage,
            null,
            res,
            null
          );
        }
      } else {
        data = {
          redeem_url: isUnUsedExist.redeem_url,
          reward_url: isUnUsedExist.reward_url,
          reward_code: isUnUsedExist.reward_code,
        };
      }
      const responseLocalization = await SystemLocalization.findOne({
        lang_id: customer.default_language,
        key: `${customer.default_language}_response_${RESPONSE_ACTION.QRCODE_FOR_REDEEM_POINTS}`, // langId_response_action
        eid: customer.default_language,
      });

      const responseMessage =
        customer.default_language == req.default_language ||
        !responseLocalization
          ? "QR code for points redeem"
          : responseLocalization.value;
      return response.send(1, STATUS_CODE.OK, responseMessage, data, res, null);
    } catch (error) {
      // console.error(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching QR code : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer/get-redeem-qrcode",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        1,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch QR code",
        null,
        res,
        ERROR.INTERNAL_SERVER_ERROR
      );
    }
  },
];


// ------------------------- Exports ----------------------------

module.exports = CONTROLLER;


async function generateQrCode(data) {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(data, (err, code) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(code);
        });
    });
}

async function uploadQrCodeToS3(base64, customerId, folder) {
    const fileInfo = getFileInfoFromBase64(base64);
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const { fileExtension, mimeType } = fileInfo;
    const metadata = { customer: customerId };
    const transformedBuffer = await S3.prepareForS3Upload(buffer);
    const filePath = await S3.upload(
        `${folder}/${customerId}`,
        fileExtension,
        mimeType,
        transformedBuffer,
        S3_ACL.PUBLIC,
        metadata
    );
    return `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
}



/**
 * @swagger
 * /v1/customer/get-redeem-qrcode:
 *   get:
 *     tags: [Customer]
 *     summary: Retrieve QR code for points redeem
 *     description: Get a unique QR code for redeeming reward points for the authenticated customer. The QR code is returned in base64 format and also uploaded to S3.
 *     responses:
 *       200:
 *         description: QR code for points redeem retrieved successfully
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
 *                   example: QR code for points redeem retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     redeem_url:
 *                       type: string
 *                       description: URL to the redeem QR code image stored in S3
 *                       example: "https://cdn.yourservice.com/s3bucket/foodics/customer123/redeem_qr_code.png"
 *                     reward_url:
 *                       type: string
 *                       description: URL to the reward QR code image stored in S3
 *                       example: "https://cdn.yourservice.com/s3bucket/foodics/customer123/reward_qr_code.png"
 *                     reward_code:
 *                       type: string
 *                       description: Unique code for the reward
 *                       example: "UNIQUE12345"
 *       401:
 *         description: Unauthorized - Invalid or missing access token
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
 *                   example: Unauthorized - Invalid or missing access token
 *       406:
 *         description: Not acceptable - Unable to create QR code
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
 *                   example: Could not create QR code
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
 *                   example: Internal server error
 */
