// const { Merchant } = require('@src/models'); // Import your Mongoose model
// const QRCode = require('qrcode');
// const { getFileInfoFromBase64: { getFileInfoFromBase64 } } = require('@src/utils')
// const {
//   S3_ACL,
//   S3_UPLOAD_FOLDER,

// } = require("@src/constants");
// const { S3_ENDPOINT, S3_CDN_URL, S3_BUCKET } = require("@src/config");
// const { S3 } = require("@src/lib");
// async function seedMerchant() {
//   try {
//     const merchants = await Merchant.find({
//       updated_at: {
//         $gt: "2025-02-03T06:03:49.504+00:00"
//       }
//     })
//     for (const merchant of merchants) {
//       console.log("🚀 ~ seedMerchant ~ merchant:", merchant.id)
//       // console.log("🚀 ~ seedMerchant ~ merchant:", merchant.qr_code)

//       // const qrCode = await generateQrCode(`
//       //   {
//       //   "merchantId":"${merchant.id}"
//       //   }`);
//       const qr_code = await uploadQrCodeToS3(
//         merchant.qr_code,
//         merchant.id,
//         S3_UPLOAD_FOLDER.MERCHANT
//       )
//       console.log("🚀 ~ seedMerchant ~ qr_code:", qr_code)
//       await Merchant.updateOne({ _id: merchant._id }, { qr_code: qr_code });
//     }

//   } catch (error) {
//     console.error('Error seeding Merchant:', error);
//     process.exit(1);
//   }
// }
// async function generateQrCode(data) {
//   return new Promise((resolve, reject) => {
//     QRCode.toDataURL(data, (err, code) => {
//       if (err) {
//         reject(err);
//         return;
//       }
//       resolve(code);
//     });
//   });
// }

// async function uploadQrCodeToS3(base64, merchantId, folder) {
//   console.log("🚀 ~ uploadQrCodeToS3 ~ merchantId, folder:", merchantId, folder)
//   // console.log("🚀 ~ uploadQrCodeToS3 ~ base64:", base64)
//   const fileInfo = getFileInfoFromBase64(base64);
//   console.log("🚀 ~ uploadQrCodeToS3 ~ fileInfo:", fileInfo)
//   const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
//   const buffer = Buffer.from(base64Data, 'base64');
//   console.log("🚀 ~ uploadQrCodeToS3 ~ buffer:", buffer)
//   const { fileExtension, mimeType } = fileInfo;
//   const metadata = { merchant: merchantId };
//   const transformedBuffer = await S3.prepareForS3Upload(buffer);
//   const filePath = await S3.upload(
//     `${folder}/${merchantId}`,
//     fileExtension,
//     mimeType,
//     transformedBuffer,
//     S3_ACL.PUBLIC,
//     metadata
//   );
//   return `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
// }

// module.exports = {
//   seedMerchant
// };
