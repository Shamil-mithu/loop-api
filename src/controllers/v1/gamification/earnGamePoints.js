"use strict";

const {
  Gamification,
  SpinMachineGame,
  SlotMachineGame,
  TransactionSource,
  CustomerTransaction,
  CustomerBalance,
  Merchant,
  Customer,
  Currency,
} = require("@src/models");
const { validate, verifyAuth, tenantAuth } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  LOG_TYPE,
  HTTP_VERBS,
  STATUS_CODE,
  GAMIFICATION_TYPE,
  TRANSACTION_SOURCE_NAME,
  TRANSACTION_TYPE,
  TRANSACTION_SOURCE_TYPE,
  TRANSACTION_STATUS,
  SPIN_WHEEL_GAME_POINTS,
  SLOT_MACHINE_GAME_POINTS,
  COLLECTION,
  MERCHANT_TYPE,
  ERROR,
} = require("@src/constants");
const {
  response,
  insertMessageLog,
  getRandomWheelPoints,
  generateUniqueDocumentNumber,
} = require("@src/utils");
const { Joi } = require("@root/src/lib");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  tenantAuth(),
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      index: Joi.string().required(),
      type: Joi.string()
        .valid(...Object.values(GAMIFICATION_TYPE))
        .required(),
    }),
  }),
  async function earnGamePointsV1Controller(req, res) {
    try {
      const { tenantId } = req;
      const { customer } = req;
      const customer_id = customer.id;
      const { index, type } = req.body;

      if (customer.is_earned_gaming_points) {
        return response.send(
          0,
          STATUS_CODE.BAD_REQUEST,
          "Already earned gamification points",
          null,
          res,
          ERROR.BAD_REQUEST
        );
      }
      const query = {
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      };
      let points = 0;

      if (type === GAMIFICATION_TYPE.SPIN_WHEEL) {
        const data = await SpinMachineGame.find(query).sort({
          display_order: 1,
        });
        points = data[index].points;
      } else {
        const data = await SlotMachineGame.find(query).sort({
          display_order: 1,
        });
        const indexes = index.split("");
        if (indexes[0] === indexes[1] && indexes[1] === indexes[2]) {
          const i = indexes[0];
          points = data[i].points * 5;
        } else {
          indexes.forEach((index) => {
            points += data[index].points;
          });
        }
      }

      const networkMerchant = await Merchant.findOne({
        type: MERCHANT_TYPE.INTERNAL,
      });
      const currency = await Currency.findOne({
        code: networkMerchant.currency,
      });
      const currency_point_rate = currency.point_rate;

      const calculated_amout = points * currency_point_rate;

      const unique_number = await generateUniqueDocumentNumber(
        "unique_number",
        Gamification
      );
      const gamificationData = {
        tenant_id: tenantId,
        customer_id,
        index,
        points,
        type,
        unique_number,
        reference_id: networkMerchant.id,
        reference_type: COLLECTION.MERCHANT,
        amount: calculated_amout,
        discount_amount: 0,
        currency: currency.id,
      };

      const new_game_earning = await Gamification.create(gamificationData);

      await Customer.findOneAndUpdate(
        { _id: customer_id },
        { $set: { is_earned_gaming_points: true } },
        { new: true }
      );

      const networkTransactionSource = await TransactionSource.findOne({
        name: TRANSACTION_SOURCE_NAME.POINTS_THROUGH_GAMIFICATION,
        earning_type: TRANSACTION_TYPE.NETWORK,
        transaction_type: TRANSACTION_SOURCE_TYPE.EARNING,
      });

      if (!networkTransactionSource) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          "no transaction source for this earning",
          null,
          res,
          ERROR.CONFLICT
        );
      }

      const transaction_status =
        customer.disable_earning === false
          ? TRANSACTION_STATUS.ENABLED
          : TRANSACTION_STATUS.DISABLED;
      await CustomerTransaction.create({
        tenant_id: tenantId,
        entity_id: networkMerchant.id,
        entity_type: COLLECTION.MERCHANT,
        reference_id: new_game_earning.id,
        reference_type: COLLECTION.GAMIFICATION,
        customer_id: customer_id,
        points: points,
        points_type: TRANSACTION_TYPE.NETWORK,
        transaction_source_id: networkTransactionSource.id,
        transaction_type: TRANSACTION_SOURCE_TYPE.EARNING,
        status: transaction_status,
      });

      if (!customer.disable_earning) {
        await CustomerBalance.findOneAndUpdate(
          {
            customerId: customer_id,
            reference_id: networkMerchant.brand_id,
            reference_type: COLLECTION.BRAND,
          },
          {
            $inc: { balance: points },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      return response.send(
        1,
        STATUS_CODE.OK,
        `you have earned ${points} gamification points`,
        null,
        res,
        null
      );
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while earning gamification points: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/gamification/earning`,
        HTTP_VERBS.POST,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't earn gamification points",
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
 *   name: Gamification
 *   description: APIs for gamification operations
 */

/**
 * @swagger
 * /v1/gamification/earning:
 *   post:
 *     tags: [Gamification]
 *     summary: Reward customer gamification points
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               index:
 *                 type: string
 *                 example: "1"
 *               type:
 *                 type: string
 *                 enum: [spin-wheel, slot-machine]
 *                 example: spin-wheel
 *     responses:
 *       '200':
 *         description: reaward customer gamification points
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
 *                   example: "you have earned 50 gamificationpoints"
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
 *                   example: "Couldn't reward customer"
 *                 data:
 *                   type: object
 *                   properties:
 *                     error:
 *                       type: string
 *                       example: "Detailed error message here"
 */
