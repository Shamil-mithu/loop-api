"use strict";

const { verifyAuth } = require("@src/middlewares");
const { response, insertMessageLog } = require("@src/utils");
const {
  Merchant,
  CustomerBalance,
  Order,
  CustomerClassification,
  CustomerTransaction,
  Language,
  SystemLocalization,
  Currency,
  CryptoCurrency,
  Customer,
} = require("@src/models");
const {
  STATUS_CODE,
  ERROR,
  TRANSACTION_SOURCE_TYPE,
  LOG_TYPE,
  HTTP_VERBS,
  COLLECTION,
  CURRENCY_KIND,
  MERCHANT_TYPE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} = require("@src/constants");
const { Types } = require("mongoose");
const { formatCount } = require("@src/utils");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  verifyAuth(),
  async function showUserV1Controller(req, res) {
    try {
      let customer = null;
      customer = await Customer.findOne({
        _id: req.customer.id,
      });
      if (!customer) customer = req.customer;

      //   customer default currecny
      let customerDefaultCusrrency = null;
      let currencyModel = Currency;
      if (customer?.default_currency && customer?.currency_type) {
        currencyModel =
          customer.currency_type === CURRENCY_KIND.CRYPTO
            ? CryptoCurrency
            : Currency;

        customerDefaultCusrrency = await currencyModel.findOne({
          _id: customer.default_currency,
          $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        });
      } else {
        customerDefaultCusrrency = await Currency.findOne({
          code: "SAR",
          $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        });
      }

      const networkMerchant = await Merchant.findOne({
        type: MERCHANT_TYPE.INTERNAL,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      const customerBalance = await CustomerBalance.findOne({
        customerId: customer.id,
        reference_id: networkMerchant.brand_id,
        reference_type: COLLECTION.BRAND,
      });
      const pendingPoints = await CustomerTransaction.aggregate([
        {
          $match: {
            customer_id: new Types.ObjectId(customer.id),
            transaction_type: TRANSACTION_SOURCE_TYPE.EARNING,
            status: TRANSACTION_STATUS.PENDING,
            points_type: TRANSACTION_TYPE.NETWORK,
            $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
          },
        },
        {
          $group: {
            _id: null,
            point: { $sum: "$points" },
          },
        },
      ]).then((result) => {
        if (result[0]?.point) return { points: result[0].point };
        else return { points: 0 };
      });

      const customerPoints = customerBalance?.balance ?? 0;
      const customerPendingPoints = pendingPoints.points;
      const customerCurrencyPointRate =
        customerDefaultCusrrency?.point_rate || 1;
      const convertedPoints = {
        value: customerPoints * customerCurrencyPointRate,
        formated_value: formatCount(customerPoints * customerCurrencyPointRate),
        code: customerDefaultCusrrency?.code || "",
      };

      const orderResult = await Order.aggregate([
        {
          $match: {
            customer_id: new Types.ObjectId(customer.id),
            $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: "$amount" },
            total_document: { $count: {} },
          },
        },
      ]).then((result) => {
        if (result[0]?.count) {
          const formattedCount = formatCount(result[0].count);
          return {
            spendings: formattedCount,
            total_count: result[0].total_document,
          };
        } else return { spendings: 0, total_count: 0 };
      });

      const transactions = await CustomerTransaction.aggregate([
        {
          $match: {
            customer_id: new Types.ObjectId(customer.id),
            transaction_type: TRANSACTION_SOURCE_TYPE.EARNING,
            // entity_id: new Types.ObjectId(networkMerchant.id),
            points_type: TRANSACTION_TYPE.NETWORK,
            $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
          },
        },
        {
          $group: {
            _id: null,
            point: { $sum: "$points" },
          },
        },
      ]).then((result) => {
        if (result[0]?.point) return { points: result[0].point };
        else return { points: 0 };
      });
      const classification = await CustomerClassification.findOne({
        points: {
          $gt: transactions.points,
        },
        deleted_at: { $exists: false },
      })
        .sort({ points: 1 })
        .exec();

      const lowClassification = await CustomerClassification.findOne({
        points: {
          $lte: transactions.points,
        },
        deleted_at: { $exists: false },
      })
        .sort({ points: -1 })
        .exec();

      const customer_detail = {
        id: customer.id,
        email: customer.email,
        phone_number: customer.phone_number,
        gender: customer.gender,
        name: customer.name,
        profile_pic: customer.profile_pic,
        date_of_birth: customer.date_of_birth,
        email_verified_at: customer.email_verified_at,
        referred_code: customer.referred_code,
        referral_code: customer.referral_code,
        spendings: orderResult.spendings, //'0K',
        transactions: orderResult.total_count, //0,
        points: customerPoints,
        pending_points: customerPendingPoints,
        formatted_points: formatCount(customerPoints),
        converted_points: convertedPoints,
        default_language: customer?.default_language,
        default_currency:
          customer?.default_currency ?? customerDefaultCusrrency?.id,
        currency_type:
          customer?.currency_type ?? customerDefaultCusrrency?.currency_type,
        is_earned_gaming_points: customer?.is_earned_gaming_points,
      };
      let CPL, PL;
      if (
        customer?.default_language.toString() !==
        defaultSystemLang._id.toString()
      ) {
        let localName;
        if (!lowClassification) {
          localName = await SystemLocalization.findOne({
            key: `basic_customerClassification_name`,
            lang_id: customer?.default_language,
          });
        } else {
          localName = await SystemLocalization.findOne({
            key: `${lowClassification?.id}_customerClassification_name`,
            lang_id: customer?.default_language,
          });
        }

        if (localName) {
          CPL = localName.value;
        } else {
          CPL = lowClassification?.name ?? "Basic";
        }

        const progressLocalName = await SystemLocalization.findOne({
          key: `${classification?.id}_customerClassification_name`,
          lang_id: customer?.default_language,
        });
        if (progressLocalName) {
          PL = progressLocalName.value;
        } else {
          PL = classification?.name ?? "Basic";
        }
      } else {
        CPL = lowClassification?.name ?? "Basic";
        PL = classification?.name ?? "Basic";
      }

      const data = {
        customer: customer_detail,
        classification: {
          points_to_reach:
            classification?.points - transactions?.points > 0
              ? classification?.points - transactions?.points
              : 0,
          points_to_reach_formatted:
            classification?.points - transactions?.points > 0
              ? formatCount(classification?.points - transactions?.points)
              : 0,
          progress_points: transactions?.points ?? 0,
          progress_points_formatted: formatCount(transactions?.points ?? 0),
          progress_level: PL,
          progress_level_point: classification?.points ?? 0,
          progress_level_point_formatted: formatCount(
            classification?.points ?? 0
          ),
          current_progress_level: CPL,
          progress_level_image: classification?.image,
          current_progress_level_image: lowClassification?.image,
        },
      };
      return response.send(
        1,
        STATUS_CODE.OK,
        "Customer profile information",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching Customer profile information : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/customer/get-profile",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        1,
        STATUS_CODE.OK,
        "Couldn't fetch Customer profile information",
        null,
        res,
        ERROR.INTERNAL_SERVER_ERROR
      );
    }
  },
];

// ------------------------- Exports ----------------------------

module.exports = CONTROLLER;

/**
 * @swagger
 * /v1/customer/get-profile:
 *   get:
 *     tags: [Customer]
 *     summary: Get customer profile information
 *     responses:
 *       200:
 *         description: Customer profile information retrieved successfully
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
 *                   example: Customer profile information
 *                 data:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: string
 *                           example: "customer@example.com"
 *                         phone_number:
 *                           type: string
 *                           example: "+1234567890"
 *                         gender:
 *                           type: string
 *                           example: "male"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         profile_pic:
 *                           type: string
 *                           example: "https://example.com/profile.jpg"
 *                         date_of_birth:
 *                           type: string
 *                           format: date
 *                           example: "1990-01-01"
 *                         email_verified_at:
 *                           type: string
 *                           format: date-time
 *                           example: "2022-05-01T12:00:00Z"
 *                         referred_code:
 *                           type: string
 *                           example: "ABCD123"
 *                         referral_code:
 *                           type: string
 *                           example: "EFGH456"
 *                         spendings:
 *                           type: string
 *                           example: "0K"
 *                         transactions:
 *                           type: integer
 *                           example: 0
 *                         points:
 *                           type: integer
 *                           example: 100
 *                         formatted_points:
 *                           type: string
 *                           example: "100"
 *                         converted_points:
 *                           type: object
 *                           properties:
 *                              value:
 *                                  type: string
 *                                  example: 1250
 *                              formated_value:
 *                                  type: string
 *                                  example: 1.25k
 *                              code:
 *                                  type: string
 *                                  example: SAR
 *                         default_language:
 *                           type: string
 *                           example: "en"
 *                         default_currency:
 *                           type: string
 *                           example: "66a0dcde13856982f86c1fcc"
 *                         currency_type:
 *                           type: string
 *                           example: FIAT | CRYPTO
 *                         points_to_usd_valuation:
 *                           type: number
 *                           format: double
 *                           example: 35.0
 *                     classification:
 *                       type: object
 *                       properties:
 *                         points_to_reach:
 *                           type: integer
 *                           example: 50
 *                         points_to_reach_formatted:
 *                           type: string
 *                           example: "50"
 *                         progress_points:
 *                           type: integer
 *                           example: 100
 *                         progress_points_formatted:
 *                           type: string
 *                           example: "100"
 *                         progress_level:
 *                           type: string
 *                           example: "Gold"
 *                         progress_level_point:
 *                           type: integer
 *                           example: 200
 *                         progress_level_point_formatted:
 *                           type: string
 *                           example: "200"
 *                         current_progress_level:
 *                           type: string
 *                           example: "Silver"
 *                         progress_level_image:
 *                           type: string
 *                           example: "https://example.com/gold.png"
 *                         current_progress_level_image:
 *                           type: string
 *                           example: "https://example.com/silver.png"
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
