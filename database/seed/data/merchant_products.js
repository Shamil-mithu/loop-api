const { MERCHANT_PRODUCT_STATUS } = require('@src/constants');

const MERCHANT_PRODUCTS = [
    {
        merchant_category_id: ["6666f8de69476b411a5b37b3"],
        name: 'Cheese Burger',
        status: MERCHANT_PRODUCT_STATUS.ACTIVE,
        image: 'https://example.com/images/cheese-burger.png',
        price: 5.99
    },
    {
        merchant_category_id: ["6666f8de69476b411a5b37d3"],
        name: 'Pepperoni Pizza',
        status: MERCHANT_PRODUCT_STATUS.ACTIVE,
        image: 'https://example.com/images/pepperoni-pizza.png',
        price: 8.99
    },
    {
        merchant_category_id: ["6666f8de69476b411a5b37e0"],
        name: 'Veggie Calzone',
        status: MERCHANT_PRODUCT_STATUS.ACTIVE,
        image: 'https://example.com/images/veggie-calzone.png',
        price: 7.49
    },
    {
        merchant_category_id: ["6666f8de69476b411a5b37e4","6666f8de69476b411a5b37e0","6666f8de69476b411a5b37d3"],
        name: 'Top Deal Combo',
        status: MERCHANT_PRODUCT_STATUS.ACTIVE,
        image: 'https://example.com/images/top-deal-combo.png',
        price: 12.99
    },
    {
        merchant_category_id: ["664dd5f9ffe0ca132fca3f24"],
        name: 'Special Offer Pizza',
        status: MERCHANT_PRODUCT_STATUS.ACTIVE,
        image: 'https://example.com/images/special-offer-pizza.png',
        price: 9.99
    }
];

module.exports = {
    MERCHANT_PRODUCTS
};
