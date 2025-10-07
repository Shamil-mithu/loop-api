"use strict";

const { Ticket, SystemLocalization } = require("@src/models");
const { Joi, S3 } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  S3_ACL,
  S3_UPLOAD_FOLDER,
  TICKET_STATUS,
  TICKET_SUPPORT_TYPES,
  ARABIC_RESPONSES,
  RESPONSE_ACTION,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const {
  response,
  getFileInfoFromBase64: { getFileInfoFromBase64 },
  generateUniqueTicketNumber,
  insertMessageLog,
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
      support_type: Joi.string()
        .valid(...Object.values(TICKET_SUPPORT_TYPES))
        .required(),
      title: Joi.string().required(),
      description: Joi.string().required(),
      attachment: Joi.string().optional().allow(""),
    }),
  }),
  async function createTicket(req, res) {
    try {
      const {
        customer,
        body: { support_type, title, description, attachment = "" },
      } = req;

      let attachmentUrl = "";

      if (attachment.length > 0) {
        const fileInfo = getFileInfoFromBase64(attachment);
        const base64Data = attachment.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const { fileExtension, mimeType } = fileInfo;

        const folder = S3_UPLOAD_FOLDER.TICKET;
        const unique_ticket_number = await generateUniqueTicketNumber();
        const metadata = { customer: customer.id };

        const transformedBuffer = await S3.prepareForS3Upload(buffer);
        const filePath = await S3.upload(
          `${folder}/${unique_ticket_number}`,
          fileExtension,
          mimeType,
          transformedBuffer,
          S3_ACL.PUBLIC,
          metadata
        );

        attachmentUrl = `${S3_CDN_URL}/${S3_BUCKET}/${filePath}`;
      }
      const unique_ticket_number = await generateUniqueTicketNumber();
      let ticket = await Ticket.create({
        user_id: customer?.id ?? null,
        support_type,
        title,
        description,
        ticket_status: TICKET_STATUS.OPEN,
        ticket_number: `#${unique_ticket_number}`,
        attachment: attachmentUrl ? [attachmentUrl] : [],
      });
      if (!ticket) {
        const sys_localization = await SystemLocalization.findOne({
          eid: customer.default_language,
          key: `${customer.default_language}_response_${RESPONSE_ACTION.COULD_NOT_CREATED_TICKET}`,
          lang_id: customer.default_language,
        });

        const responseMessage =
          customer.default_language == req.default_language || !sys_localization
            ? "could not create ticket"
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
      ticket = {
        ...ticket._doc,
        created_at: ticket.created_at.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        time: moment(ticket.created_at).format("hh:mm A"),
      };
      const sys_localization = await SystemLocalization.findOne({
        eid: customer.default_language,
        key: `${customer.default_language}_response_${RESPONSE_ACTION.TICKET_CREATED_SUCCESSFULLY}`,
        lang_id: customer.default_language,
      });
      const responseMessage =
        customer.default_language == req.default_language || !sys_localization
          ? "ticket created successfully"
          : sys_localization.value;

      return response.send(
        1,
        STATUS_CODE.OK,
        responseMessage,
        ticket,
        res,
        null
      );
    } catch (error) {
      // console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while creating ticket : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/ticket/create",
        HTTP_VERBS.POST,
        req?.customer?.id || null
      );
      if (error instanceof S3Error) {
        response.send(
          0,
          error.status_code,
          "Couldn't create ticket",
          null,
          res,
          error.details
        );
      } else {
        response.send(
          0,
          STATUS_CODE.INTERNAL_SERVER_ERROR,
          "Couldn't create ticket",
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
 *   name: Ticket
 *   description: APIs for Ticket operations
 */

/**
 * @swagger
 * /v1/ticket/create:
 *   post:
 *     tags: [Ticket]
 *     summary: Create a new support ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               support_type:
 *                 type: string
 *                 enum: [technical, billing, other]  # Adjust enum based on your constants
 *                 example: technical
 *                 description: Type of support required
 *               title:
 *                 type: string
 *                 example: Issue accessing my account
 *                 description: Title of the ticket
 *               description:
 *                 type: string
 *                 example: I have been unable to access my account for the past week.
 *                 description: Detailed description of the issue
 *               attachment:
 *                 type: string
 *                 example: data:image/png;base64,iVBORw0K...  # Example of a valid base64 string
 *                 description: Base64 encoded image string (optional)
 *     responses:
 *       '201':
 *         description: Ticket created successfully
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
 *                   example: Ticket created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 60d5ec49f892d61180b5c9d4
 *                     user_id:
 *                       type: string
 *                       example: 60d5ec49f892d61180b5c9d4
 *                     support_type:
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
 *                   example: Could not create ticket
 */
