"use strict";

const { Store, SavedStore } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const { Joi } = require("@src/lib");
const bodyParser = require("body-parser");
const {
    STATUS_CODE,
    LOG_TYPE,
    HTTP_VERBS,
    ERROR
} = require("@src/constants");
const { response, insertMessageLog } = require("@src/utils");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------
const CONTROLLER = [
    verifyAuth(),
    bodyParser.json(),
    validate({
        body: Joi.object().keys({
            store_id: Joi.string().objectId().required(),
        }),
    }),
    async function savedStoreV1Controller(req, res) {
        try {
            const { customer, body: { store_id } } = req;
            const store = await Store.findOne({
              $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
              _id: store_id,
            });
            if (!store) {
                return response.send(0, STATUS_CODE.NOT_FOUND, 'no store with this id', null, res, ERROR.NOT_FOUND)
            }
            const savedStore = await SavedStore.findOneAndUpdate({
                customer_id: customer.id,
                store_id: store_id,
                is_expired: false,
                $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
            }, {
                customer_id: customer.id,
                store_id: store_id
            }, {
                upsert: true
            })
         
            return response.send(1, STATUS_CODE.OK, 'store saved', savedStore, res, null)
        } catch (error) {
            console.log(error);
            insertMessageLog(
                LOG_TYPE.ERROR,
                `Exception while saving store : ${error?.message}`,
                {
                    message: error?.message,
                    stack: error?.stack,
                    errorObject: error,
                },
                "/v1/store/save",
                HTTP_VERBS.POST,
                req?.customer?.id || null
            );
            return response.send(
                0,
                STATUS_CODE.INTERNAL_SERVER_ERROR,
                "Couldn't save store",
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
 *   name: Store
 *   description: APIs for store operations
 */

/**
 * @swagger
 * /v1/store/save:
 *   post:
 *     tags: [Store]
 *     summary: Create saved store
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               store_id:
 *                 type: string
 *                 default: 6735dffc0ad75bd326737de9
 *     responses:
 *       '200':
 *         description: saved store
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: store ID
 *                         example: "60af9245d3c41e2a4c8d4af8"
 *                       name:
 *                         type: string
 *                         description: store name
 *                         example: "Mithu"
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
 *                   example: Could not process the request
 */
