const { SUPPORTED_IMAGE_FORMATS,STATUS_CODE,ERROR,MAX_FILE_SIZE_BYTES} = require('@src/constants')
const { S3Error } = require("@src/errors");

function getFileInfoFromBase64(base64String) {
    // Extract the data URL scheme part (if present)
    const match = base64String.match(/^data:(.*);base64,/);
    if (!match) {
        throw new S3Error(STATUS_CODE.UNPROCESSABLE_ENTITY, ERROR.INVALID_BASE64_STRING)
    }
    // Extract MIME type
    const mimeType = match[1];
    // Extract the base64 data part
    const base64Data = base64String.replace(/^data:.*;base64,/, '');

    // Calculate the file size
    const buffer = Buffer.from(base64Data, 'base64');
    const fileSizeInBytes = buffer.length;

    // Derive file extension from MIME type
    const mimeToExtension = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/svg': 'svg',
        'image/jpeg': 'jpeg',
    };

    const fileExtension = mimeToExtension[mimeType] || mimeType.split('/')[1];
    if (Object.values(SUPPORTED_IMAGE_FORMATS).indexOf(fileExtension) < 0) {
        throw new S3Error(STATUS_CODE.UNSUPPORTED_MEDIA_TYPE, ERROR.UNSUPPORTED_MEDIA_TYPE)
    }
    if (fileSizeInBytes > MAX_FILE_SIZE_BYTES) {
        throw new S3Error(STATUS_CODE.PAYLOAD_TOO_LARGE, ERROR.EXCEEDS_SIZE_LIMIT);
    }

    return {
        mimeType,
        fileExtension,
        fileSizeInBytes
    };
}

module.exports = {
    getFileInfoFromBase64
}