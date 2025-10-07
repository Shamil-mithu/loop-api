"use strict";

const { Models: { FoodicsReward } } = require('@mithu/models-constants');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const S3 = require("@src/lib/S3");
const { S3_CDN_URL, S3_BUCKET } = require("@src/config");
const {
  Constants: { S3_UPLOAD_FOLDER, S3_ACL },
} = require("@mithu/models-constants");
const { Buffer } = require("buffer");
const { getFileInfoFromBase64 } = require("./getFileInfoFromBase64");

async function generateRewardCode() {
  const uuid = uuidv4();
  const hash = crypto.createHash("sha256").update(uuid).digest("hex");
  const base10Number = hash
    .toString()
    .replace(/[^0-9]/g, "")
    .slice(10, 18);
  return base10Number;
}

async function generateUniqueRewardCode() {
  let rewardCode, rewardCodes;
  do {
    rewardCode = await generateRewardCode();
    const existingRewardCodes = await FoodicsReward.find({
      reward_code: rewardCode,
    }).select({ reward_code: 1 });
    rewardCodes = existingRewardCodes.map(
      (reward_code) => reward_code.reward_code
    );
  } while (rewardCodes.includes(rewardCode));
  return rewardCode;
}

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
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
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



module.exports = { generateUniqueRewardCode, uploadQrCodeToS3, generateQrCode };
