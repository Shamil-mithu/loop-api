const { CustomerBalance, Brand, Order, Currency, Settings } = require("@src/models");
const {
    ORDER_STATUS,
    SETTINGS_KEYS
} = require("@src/constants");

const { formatCount } = require('@src/utils');

async function calculateCustomerDataForWalletPass(customer) {
    const defaultCurrency = await Currency.findOne({
        _id: customer.default_currency
    });

    const mithuBrand = await Brand.findOne({
        name: "Mithu",
    });

    const customerBalance = await CustomerBalance.findOne({
        customerId: customer._id,
        reference_id: mithuBrand._id,
    });

    const customerOrderCount = await Order.countDocuments({
        customer_id: customer._id,
        status: ORDER_STATUS.CREATED
    });

    const point_to_cash =
        formatCount((customerBalance?.balance || 0) * defaultCurrency.point_rate);
    const customerPoints = formatCount(customerBalance?.balance ?? 0);

    return {
        userId: customer._id,
        name: customer.name,
        points: customerPoints,
        orderCount: customerOrderCount,
        created_at: customer.created_at,
        default_currency_symbol: defaultCurrency?.code,
        points_to_cash: point_to_cash,
        member_since: customer.created_at?.toLocaleDateString(),
        ...customer.toObject(),
    };
}

async function getClassIdFromSettings() {
    const classSettings = await Settings.findOne({
        key: SETTINGS_KEYS.GOOGLE_WALLET_CLASS_ID,
    });
    return classSettings?.value || 'loyalty_class_001'; // Default class ID if not found
}
module.exports = { calculateCustomerDataForWalletPass, getClassIdFromSettings };