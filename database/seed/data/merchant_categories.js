const { MERCHANT_CATEGORY_STATUS } = require('@src/constants');

const MERCHANT_CATEGORIES = [
    {
        merchant_id: "664dd5f9ffe0ca132fca3f19", // Replace with actual merchant_id
        name: 'Burger',
        status: MERCHANT_CATEGORY_STATUS.ACTIVE,
    },
    {
        merchant_id: "664dd5f9ffe0ca132fca3f19", // Replace with actual merchant_id
        name: 'Pizza',
        status: MERCHANT_CATEGORY_STATUS.ACTIVE,
    },
    {
        merchant_id: "664dd5f9ffe0ca132fca3f19", // Replace with actual merchant_id
        name: 'Calzone',
        status: MERCHANT_CATEGORY_STATUS.ACTIVE,
    },
    {
        merchant_id: "664dd5f9ffe0ca132fca3f19", // Replace with actual merchant_id
        name: 'Top Deals',
        status: MERCHANT_CATEGORY_STATUS.ACTIVE,
    },
    {
        merchant_id: "664dd5f9ffe0ca132fca3f19", // Replace with actual merchant_id
        name: 'Special Offers',
        status: MERCHANT_CATEGORY_STATUS.ACTIVE,
    }
];

module.exports = {
    MERCHANT_CATEGORIES
}