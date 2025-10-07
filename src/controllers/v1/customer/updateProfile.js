"use strict";

const { Customer, SystemLocalization } = require("@src/models");
const { Joi, S3 } = require('@src/lib')
const { Apple } = require('@src/services');
const { S3_ENDPOINT, S3_CDN_URL, S3_BUCKET } = require("@src/config");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  CUSTOMER_GENDER,
  S3_ACL,
  S3_UPLOAD_FOLDER,
  ARABIC_RESPONSES,
  RESPONSE_ACTION,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const {
  response,
  getFileInfoFromBase64: { getFileInfoFromBase64 },
  insertMessageLog,
} = require("@src/utils");
const { S3Error } = require("@src/errors");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object()
      .keys({
        profile_pic: Joi.string().optional().allow(""),
        gender: Joi.string()
          .allow("")
          .valid(...Object.keys(CUSTOMER_GENDER)),
        date_of_birth: Joi.object().keys({
          date: Joi.number().integer().allow(null).min(1).max(31),
          month: Joi.number().integer().allow(null).min(1).max(12),
          year: Joi.number()
            .integer()
            .allow(null)
            .min(new Date().getFullYear() - 100)
            .max(new Date().getFullYear()),
        }),
        name: Joi.string().allow(""),
        email: Joi.string().allow(""),
      })
      .required(),
  }),
  async function updateUserProfileV1(req, res) {
    try {
      const {
        customer,
        body: { date_of_birth, name, gender, profile_pic, email },
      } = req;

      let attachmentUrl = "";
      if (profile_pic?.length > 0) {
        const fileInfo = getFileInfoFromBase64(profile_pic);
        const base64Data = profile_pic.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const { fileExtension, mimeType } = fileInfo;

        const folder = S3_UPLOAD_FOLDER.CUSTOMER;
        const metadata = { customer: customer.id };

        const transformedBuffer = await S3.prepareForS3Upload(buffer);
        const filePath = await S3.upload(
          `${folder}/${customer.id}`,
          fileExtension,
          mimeType,
          transformedBuffer,
          S3_ACL.PUBLIC,
          metadata
        );

        attachmentUrl = `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
      }
      const updatedUser = await Customer.findOneAndUpdate(
        {
          _id: customer.id,
        },
        {
          gender: gender?.length > 0 ? gender : customer.gender,
          date_of_birth:
            date_of_birth != null ? date_of_birth : customer.date_of_birth,
          name: name?.length > 0 ? name : customer.name,
          profile_pic:
            attachmentUrl.length > 0 ? attachmentUrl : customer.profile_pic,
          email: email?.length > 0 ? email : null,
        },
        {
          new: true,
        }
      );
      if (email?.length > 0) {
        updatedUser.email_verified_at = Date.now();
        await updatedUser.save();
      }
      if (name.length > 0 && customer?.apple_pass_push_token) {
        Apple.sendPassUpdateNotification(customer?.apple_pass_push_token, req)
      }
      const sys_localization = await SystemLocalization.findOne({
        eid: customer.default_language,
        key: `${customer.default_language}_response_${RESPONSE_ACTION.PROFILE_UPDATED}`,
        lang_id: customer.default_language,
      });
      const responseMessage =
        customer.default_language == req.default_language || !sys_localization
          ? "profile updated"
          : sys_localization.value;
      return response.send(
        1,
        STATUS_CODE.OK,
        responseMessage,
        updatedUser,
        res,
        null
      );
    } catch (error) {
      console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating profile : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer/profile",
        HTTP_VERBS.PUT,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't update profile",
        null,
        res,
        error
      );
    }
  },
];

// -----------------------------------------EXPORTS---------------------------------------------------------
module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Customer
 *   description: APIs for customer operations
 */

/**
 * @swagger
 * /v1/customer/profile:
 *   put:
 *     tags: [Customer]
 *     summary: Update customer profile
 *     description: Update customer profile information such as name, gender, date of birth, profile picture, and email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gender:
 *                 type: string
 *                 description: Customer's gender
 *                 enum:
 *                   - male
 *                   - female
 *                   - other
 *               profile_pic:
 *                 type: string
 *                 description: Base64 encoded image string for the customer's profile picture
 *                 example: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QBaRXhpZgAASUkqAAgAAA...
 *               date_of_birth:
 *                 type: object
 *                 description: Customer's date of birth
 *                 properties:
 *                   date:
 *                     type: integer
 *                     format: int32
 *                     description: Day of the month (1-31)
 *                     example: 15
 *                   month:
 *                     type: integer
 *                     format: int32
 *                     description: Month (1-12)
 *                     example: 7
 *                   year:
 *                     type: integer
 *                     format: int32
 *                     description: Year
 *                     example: 1995
 *               name:
 *                 type: string
 *                 description: Customer's name
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 description: Customer's email address
 *                 example: john.doe@example.com
 *     responses:
 *       '200':
 *         description: Profile updated successfully
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
 *                   example: Profile updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Customer ID
 *                     email:
 *                       type: string
 *                       description: Customer's email address
 *                     name:
 *                       type: string
 *                       description: Customer's name
 *                     gender:
 *                       type: string
 *                       description: Customer's gender
 *                       enum:
 *                         - male
 *                         - female
 *                         - other
 *                     date_of_birth:
 *                       type: object
 *                       description: Customer's date of birth
 *                       properties:
 *                         date:
 *                           type: integer
 *                           description: Day of the month
 *                         month:
 *                           type: integer
 *                           description: Month
 *                         year:
 *                           type: integer
 *                           description: Year
 *                     profile_pic:
 *                       type: string
 *                       description: URL of the customer's profile picture
 *                     email_verified_at:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp when the email was verified
 *                     phone_number:
 *                       type: object
 *                       properties:
 *                         code:
 *                           type: string
 *                           description: Country code
 *                         number:
 *                           type: string
 *                           description: Phone number
 *                     phone_number_verified_at:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp when the phone number was verified
 *                     twoFA_enabled:
 *                       type: boolean
 *                       description: Whether two-factor authentication is enabled
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of profile creation
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the last profile update
 *       '400':
 *         description: Bad Request - Validation Error
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
 *                   example: Invalid input data
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
 *                   example: Internal server error
 */
