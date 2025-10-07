"use strict";

const { Customer, Language, SystemLocalization } = require("@src/models");
const { Joi } = require('@src/lib')
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
    STATUS_CODE,
    ERROR,
    RESPONSE_ACTION,
    LOG_TYPE,
    HTTP_VERBS,
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const socket = require('@root/socket')

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
    verifyAuth(),
    bodyParser.json(),
    validate({
        body: Joi.object()
            .keys({
                is_approved: Joi.boolean().required(),
                device_id: Joi.string().objectId().required(),
            })
            .required(),
    }),
    async function loginThroughFirebaseV1Controller(req, res) {
        try {
            const {
                customer,
                body: { is_approved, device_id },
            } = req;
            const responseMessage = is_approved ? 'pressed yes' : 'pressed no'
            socket.emit('vendor_customer_login_confirmation', {
                is_approved: is_approved ? true : false,
                customer_id: customer.id,
                customer_name : customer.name,
                responseMessage,
                device_id: device_id,
                phone_number : customer.phone_number

            })
            return response.send(1, STATUS_CODE.OK, 'event emitted', null, res, null);
        } catch (error) {
            console.log(error.essage ?? error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `exception while emitting the firebase login event : ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                "/v1/customer/login/is-yes-pressed",
                HTTP_VERBS.PUT,
                req?.customer?.id || null
            );
            return response.send(
                0,
                STATUS_CODE.INTERNAL_SERVER_ERROR,
                "couldn't emit the event",
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
 * /v1/customer/firebase/is-approved:
 *   post:
 *     tags: [Customer]
 *     summary: Emit Firebase login event 
 *     description: Emit an event to confirm login through Firebase, based on whether 'yes' or 'no' is pressed.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_approved:
 *                 type: boolean
 *                 description: Whether the "yes" button was pressed.
 *                 example: true
 *               device_id:
 *                 type: string
 *                 description: The device ID.
 *                 example: 123456789765
 *             required:
 *               - is_approved
 *               - device_id
 *     responses:
 *       200:
 *         description: Event emitted successfully
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
 *                   example: event emitted
 *       400:
 *         description: Bad request - missing or invalid data
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
 *       500:
 *         description: Internal server error - event emission failed
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
 *                   example: couldn't emit the event
 */
