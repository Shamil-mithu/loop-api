"use strict";

/* istanbul ignore file */

const { S3_ENDPOINT, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = require("@src/config");
const { S3_ACL, ERROR, STATUS_CODE, S3_MAX_IMAGE_SIZE, SUPPORTED_IMAGE_FORMATS } = require("@src/constants");
const { S3 } = require("@aws-sdk/client-s3");
const mime = require("mime");
const sharp = require("sharp");
const { v4: uuidV4 } = require("uuid");
const { S3Error } = require("@src/errors");

// ------------------------- Library -------------------------

const s3 = new S3({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  timeout: 30000,
});

/**
 *
 * @param {string} folder
 * @param {string} extension
 * @param {string|Uint8Array|Buffer|Readable|ReadableStream|Blob} body
 * @param {("public"|"private")=} acl
 * @returns {Promise<string>}
 */
async function upload(folder, extension, mimeType, body, acl = S3_ACL.PRIVATE, metadata = {}) {
  const Key = `${folder}/${uuidV4()}.${extension}`;
  await s3.putObject({
    Bucket: S3_BUCKET,
    Key,
    Body: body,
    ACL: acl,
    ContentType: mimeType,
    Metadata: metadata
  });

  return Key;
}

/**
 *
 * @param {string} Key
 * @returns {ReadableStream<string>}
 */
async function downloadByPipe(Key) {

  const result = await s3.getObject({
    Bucket: S3_BUCKET,
    Key,
  });
  return result.Body;

}

/**
 *
 * @param {string} Key
 * @returns {Promise<Buffer>}
 */
async function downloadAtOnce(Key) {

  const result = await s3.getObject({
    Bucket: S3_BUCKET,
    Key,
  });

  return new Promise((resolve) => {

    let data_chunks = [];

    result.Body.on("data", chunk => {
      data_chunks.push(chunk);
    });

    result.Body.on("end", () => {
      return resolve(Buffer.concat(data_chunks));
    });

  });

}

/**
 * @param {Buffer} buffer
 * @returns {Promise<import("sharp").Sharp>}
 */
async function verifyImageBuffer(buffer) {

  if (buffer.length > S3_MAX_IMAGE_SIZE) {
    throw new S3Error(STATUS_CODE.PAYLOAD_TOO_LARGE, ERROR.EXCEEDS_SIZE_LIMIT);
  }

  const image = sharp(buffer);
  const metaData = await image.metadata();

  if (metaData.format === undefined || !Object.values(SUPPORTED_IMAGE_FORMATS)) {
    throw new S3Error(STATUS_CODE.UNSUPPORTED_MEDIA_TYPE, ERROR.UNSUPPORTED_FORMAT);
  }

  image.rotate();
  return image;
}

/**
 * @param {import("sharp").Sharp} image
 * @returns {Promise<Buffer>}
 */
async function transformImage(image) {
  return image.toBuffer()
  const imageClone = image.clone();

  return imageClone.trim().jpeg().toBuffer();
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
async function prepareForS3Upload(buffer) {
  const verifiedImage = await verifyImageBuffer(buffer);
  const transformedBuffer = await transformImage(verifiedImage);

  return transformedBuffer;
}

/**
 * @param {string} folder
 * @param {String} image_id
 * @returns {Promise<Object>}
 */
async function deleteS3Image(folder, image_id) {
  const Key = `${folder}/${image_id}`;
  const response = await s3.deleteObject({
    Bucket: S3_BUCKET,
    Key,
  })

  return response;
}


/**
 * @param {string} folder
 * @param {String} image_id
 * @returns {Promise<Object>}
 */
async function retrieveObjectMetadata(folder, image_id) {
  const Key = `${folder}/${image_id}`;
  const response = await s3.headObject({
    Bucket: S3_BUCKET,
    Key,
  })

  return response;
}
// ------------------------- Exports -------------------------

module.exports = {
  upload,
  downloadAtOnce,
  downloadByPipe,
  prepareForS3Upload,
  deleteS3Image,
  retrieveObjectMetadata
};
