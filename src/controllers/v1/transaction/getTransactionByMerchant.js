"use strict";

const { Order, CustomerTransaction, Merchant } = require("@src/models");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  ERROR,
  TRANSACTION_SOURCE_TYPE,
  LOG_TYPE,
  HTTP_VERBS,
  MERCHANT_TYPE,
  COLLECTION,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} = require("@src/constants");
const { response, formatCount, insertMessageLog } = require("@src/utils");
const { Joi } = require("@src/lib");
const moment = require("moment");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  validate({
    body: Joi.object().keys({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
    params: Joi.object().keys({
      merchantId: Joi.string().required(), // Validate merchant ID from params
    }),
  }),
  bodyParser.json(),
  async function getAllCustomerTransactionV1Controller(req, res) {
    try {
      const { customer } = req;
      let { page, limit } = req.body;
      const { merchantId } = req.params;
      page = page - 1;

      let query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        customer_id: new Types.ObjectId(customer.id),
        entity_id: new Types.ObjectId(merchantId),
        points_type: TRANSACTION_TYPE.MERCHANT,
      };
      const basic_aggregate = [
        { $match: query },
        {
          $addFields: {
            unique_key: {
              $concat: [
                { $toString: "$reference_id" },
                "_",
                "$transaction_type",
              ],
            },
          },
        },
        {
          $group: {
            _id: "$unique_key", // Group by unique combination
            documents: { $push: "$$ROOT" }, // Keep all original documents in an array
          },
        },
      ];

      // Total Count Query - To get total documents based on the aggregate without skip/limit
      const totalDocuments = await CustomerTransaction.aggregate([
        ...basic_aggregate,
        { $count: "totalDocuments" }, // Count the documents in the aggregate
      ]);

      const totalCount =
        totalDocuments.length > 0 ? totalDocuments[0].totalDocuments : 0;

      // Data Fetching Query - Paginated Data
      let customerTransaction = await CustomerTransaction.aggregate([
        ...basic_aggregate,

        { $sort: { "documents.0.created_at": -1 } },

        { $skip: page * limit },
        { $limit: limit },

        { $unwind: "$documents" },

        {
          $replaceRoot: {
            newRoot: "$documents",
          },
        },

        // Perform the lookups to bring in related data
        {
          $lookup: {
            from: "customers",
            localField: "customer_id",
            foreignField: "_id",
            as: "customer",
            pipeline: [
              {
                $project: {
                  name: 1,
                  profile_pic: 1,
                  deleted_at: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "merchant",
            localField: "entity_id",
            foreignField: "_id",
            as: "merchant_entity",
            pipeline: [
              {
                $project: {
                  name: 1,
                  logo: 1,
                  type: 1,
                  currency: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "store",
            localField: "entity_id",
            foreignField: "_id",
            as: "store_entity",
            pipeline: [
              {
                $project: {
                  name: 1,
                  logo: 1,
                  currency: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "order",
            localField: "reference_id",
            foreignField: "_id",
            as: "order_reference",
            pipeline: [
              {
                $project: {
                  order_number: 1,
                  unique_number: "$order_number",
                  amount: 1,
                  discount_amount: 1,
                  created_at: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "affiliate_marketing_order",
            localField: "reference_id",
            foreignField: "_id",
            as: "affiliate_order_reference",
            pipeline: [
              {
                $project: {
                  order_number: 1,
                  unique_number: "$order_number",
                  amount: 1,
                  discount_amount: 1,
                  created_at: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "topup",
            localField: "reference_id",
            foreignField: "_id",
            as: "topup_reference",
            pipeline: [
              {
                $project: {
                  topup_number: 1,
                  unique_number: "$topup_number",
                  amount: 1,
                  discount_amount: 1,
                  created_at: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "gamification",
            localField: "reference_id",
            foreignField: "_id",
            as: "gamification_reference",
            pipeline: [
              {
                $project: {
                  unique_number: 1,
                  amount: 1,
                  discount_amount: 1,
                  created_at: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "manual_receipt",
            localField: "reference_id",
            foreignField: "_id",
            as: "manual_receipt_reference",
            pipeline: [
              {
                $project: {
                  unique_number: 1,
                  amount: "$order_amount",
                  discount_amount: 1,
                  created_at: 1,
                  _id: 0,
                  id: "$_id",
                },
              },
            ],
          },
        },

        // Add fields for customer, entity, and reference
        {
          $addFields: {
            customer: { $arrayElemAt: ["$customer", 0] },
            entity: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$entity_type", "merchant"] },
                    then: { $arrayElemAt: ["$merchant_entity", 0] },
                  },
                  {
                    case: { $eq: ["$entity_type", "store"] },
                    then: { $arrayElemAt: ["$store_entity", 0] },
                  },
                ],
                default: { $arrayElemAt: ["$merchant_entity", 0] },
              },
            },
            reference: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$reference_type", "order"] },
                    then: { $arrayElemAt: ["$order_reference", 0] },
                  },
                  {
                    case: {
                      $eq: ["$reference_type", "affiliate_marketing_order"],
                    },
                    then: { $arrayElemAt: ["$affiliate_order_reference", 0] },
                  },
                  {
                    case: { $eq: ["$reference_type", "topup"] },
                    then: { $arrayElemAt: ["$topup_reference", 0] },
                  },
                  {
                    case: { $eq: ["$reference_type", "gamification"] },
                    then: { $arrayElemAt: ["$gamification_reference", 0] },
                  },
                  {
                    case: { $eq: ["$reference_type", "manual_receipt"] },
                    then: { $arrayElemAt: ["$manual_receipt_reference", 0] },
                  },
                ],
                default: { $arrayElemAt: ["$order_reference", 0] },
              },
            },
          },
        },
        {
          $project: {
            order_reference: 0,
            affiliate_order_reference: 0,
            topup_reference: 0,
            customer_id: 0,
            merchant_id: 0,
            store_entity: 0,
            merchant_entity: 0,
          },
        },
      ]);

      const transactions_result = {};
      customerTransaction.forEach((transaction) => {
        const key = `${transaction.reference_id}_${transaction.transaction_type}`;

        if (!transactions_result[key]) {
          transactions_result[key] = {
            id: transaction._id,
            reference_id: transaction.reference_id,
            transaction_type: transaction.transaction_type,
            entity: transaction.entity,
            entity_type: transaction.entity_type,
            customer: transaction.customer,
            reference: transaction.reference,
            reference_type: transaction.reference_type,
            created_at: transaction.created_at,
          };
        }

        if (transaction.points_type === TRANSACTION_TYPE.NETWORK) {
          transactions_result[key]["network_points"] = transaction.points;
          transactions_result[key]["network_transaction_status"] =
            transaction.status;
        } else {
          transactions_result[key]["entity_points"] = transaction.points;
          transactions_result[key]["entity_transaction_status"] =
            transaction.status;
        }
      });
      const final_transactions = Object.values(transactions_result);
      final_transactions.sort((a, b) => {
        return b.created_at - a.created_at;
      });

      const page_count = +Math.ceil(totalCount / limit);

      const meta = {
        total_documents: totalCount,
        page: page + 1,
        limit: limit,
        page_count,
      };
      const data = {
        transactions: final_transactions,
        meta,
      };
      return response.send(1, STATUS_CODE.OK, "transactions", data, res, null);
    } catch (error) {
      console.log(error?.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching transactions by merchantID : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/transaction/get-all/${req?.params?.merchantId}`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch transactions by merchantID",
        null,
        res,
        error
      );
    }
  },
];

module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Transaction
 *   description: APIs for transaction operations
 */

/**
 * @swagger
 * /v1/transaction/get-all/{merchantId}:
 *   post:
 *     tags: [Transaction]
 *     summary: Get all customer transactions for a specific merchant
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the merchant
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         required: false
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         required: false
 *         description: Number of transactions per page
 *     responses:
 *       '200':
 *         description: List of customer transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status_code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: transactions
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           merchant_name:
 *                             type: string
 *                             example: "Mithu"
 *                           merchant_point:
 *                             type: number
 *                             example: 150
 *                           network_point:
 *                             type: number
 *                             example: 100
 *                           order_number:
 *                             type: string
 *                             example: "ORD12345678"
 *                           order_amount:
 *                             type: number
 *                             example: 250.00
 *                           currency:
 *                             type: string
 *                             example: "USD"
 *                           logo:
 *                             type: string
 *                             example: "https://example.com/logo.png"
 *                           created_at:
 *                             type: string
 *                             format: date
 *                             example: "2024-05-27"
 *                     total_document:
 *                       type: integer
 *                       example: 20
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
 *                 status_code:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: Error details here
 */
