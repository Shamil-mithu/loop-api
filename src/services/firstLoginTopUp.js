
const {
  Constants: {
    COLLECTION,
    TRANSACTION_SOURCE_TYPE,
    TRANSACTION_SOURCE_NAME,
    LOG_TYPE,
    HTTP_VERBS,
    TRANSACTION_TYPE,
    TRANSACTION_STATUS,
    SETTINGS_KEYS,
    MERCHANT_TYPE,
    NOTIFICATION_DESCRIPTION_ARABIC,
    NOTIFICATION_TITLE_ARABIC,
    NOTIFICATION_DESCRIPTION_ENGLISH,
    NOTIFICATION_TITLE_ENGLISH,
    NOTIFICATION_TYPES,
    NOTIFICATION_STATUS

  },
  Models: {
    CustomerTransaction,
    Settings,
    CustomerBalance,
    Currency,
    TransactionSource,
    Topup,
    Merchant,
    Language,
    Notification
  },
} = require("@mithu/models-constants");
const { generateUniqueTopupNumber,firebase,insertMessageLog } = require("../utils");


const FirstLoginTopup = async (customer, device_token) => {
  const merchant = await Merchant.findOne({
    type: MERCHANT_TYPE.INTERNAL,
    $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
  });
  try {
    const arabicLang = await Language.findOne({
      code: "ar",
    });
    const signupTopupPoints = await Settings.findOne({
      key: SETTINGS_KEYS.SIGNUP_TOPUP_POINTS,
      deleted_at: { $exists: false },
    });
    if (!signupTopupPoints) {
      console.log('no settings found for signup topup points')
      return
    }
    const merchant_topup_points = signupTopupPoints.value;

    const currency = await Currency.findOne({
      code: merchant.currency,
    });
    const currency_point_rate = currency.point_rate;
    const networkTransactionSource = await TransactionSource.findOne({
      name: TRANSACTION_SOURCE_NAME.SIGNUP_TOPUP_POINTS,
      earning_type: TRANSACTION_TYPE.NETWORK,
    });
    if (!networkTransactionSource) {
      console.log('no transaction source for first login topup')
      return
    }


    const topupAmount = merchant_topup_points * currency_point_rate;

    if (!merchant_topup_points) {
      console.log(`Skipping sign topup.`);
      return;
    }

    const uniqueTopupNumber = await generateUniqueTopupNumber();
    const newTopup = await Topup.create({
      topup_number: uniqueTopupNumber,
      reference_id: merchant.id,
      reference_type: COLLECTION.MERCHANT,
      customer_id: customer.id,
      amount: topupAmount,
      discount_amount: 0,
      currency: currency.id,
    });
    
    await CustomerTransaction.create({
      entity_id: merchant.id,
      entity_type: COLLECTION.MERCHANT,
      customer_id: customer.id,
      reference_id: newTopup.id,
      reference_type: COLLECTION.TOPUP,
      points: merchant_topup_points,
      points_type: TRANSACTION_TYPE.NETWORK,
      transaction_source_id: networkTransactionSource.id,
      transaction_type: TRANSACTION_SOURCE_TYPE.EARNING,
      status:
        customer.disable_earning === false
          ? TRANSACTION_STATUS.ENABLED
          : TRANSACTION_STATUS.DISABLED,
    });
    if (!customer.disable_earning) {
      await CustomerBalance.findOneAndUpdate(
        {
          customerId: customer.id,
          reference_id: merchant.brand_id,
          reference_type: COLLECTION.BRAND,
        },
        {
          $inc: { balance: merchant_topup_points },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }


    const message = customer?.default_language == arabicLang.id
      ? NOTIFICATION_DESCRIPTION_ARABIC.SIGNUP_TOPUP_POINTS(merchant_topup_points, topupAmount)
      : NOTIFICATION_DESCRIPTION_ENGLISH.SIGNUP_TOPUP_POINTS(merchant_topup_points, topupAmount)

    const title = customer?.default_language == arabicLang.id
      ? NOTIFICATION_TITLE_ARABIC.SIGNUP_TOPUP_POINTS
      : NOTIFICATION_TITLE_ENGLISH.SIGNUP_TOPUP_POINTS

    firebase.sendNotificationCustomer(device_token, title, message)
    const notification = await Notification.create({
      customer_id: customer._id,
      title: customer?.default_language == arabicLang.id
        ? NOTIFICATION_TITLE_ARABIC.SIGNUP_TOPUP_POINTS
        : NOTIFICATION_TITLE_ENGLISH.SIGNUP_TOPUP_POINTS,
      description: customer?.default_language == arabicLang.id
        ? NOTIFICATION_DESCRIPTION_ARABIC.SIGNUP_TOPUP_POINTS(merchant_topup_points, topupAmount)
        : NOTIFICATION_DESCRIPTION_ENGLISH.SIGNUP_TOPUP_POINTS(merchant_topup_points, topupAmount),
      type: NOTIFICATION_TYPES.INDIVIDUAL,
      status: NOTIFICATION_STATUS.UNREAD,
      entity_id: customer.id,
      entity_type: COLLECTION.CUSTOMER
    });
    if (!notification) {
      console.error('could not create notification')
      return response.send(0, STATUS_CODE.INTERNAL_SERVER_ERROR, 'error while sending notification ', null, res, ERROR.INTERNAL_SERVER_ERROR);
    }
    return
  }
  catch (error) {
    console.log(error);
    insertMessageLog(
      LOG_TYPE.ERROR,
      `Exception on toptup: ${error?.message}`,
      {
        message: error?.message,
        stack: error?.stack,
        errorObject: error,
      },
      "/auth/interaction/register",
      HTTP_VERBS.POST,
      merchant?.id || null
    );
  }
};

module.exports = FirstLoginTopup
