const { MerchantProduct } = require('@src/models');
const { MERCHANT_PRODUCTS } = require('../data/merchant_products');

async function seedMerchantProducts() {
    try {
        for (const mp of MERCHANT_PRODUCTS) {
            await MerchantProduct.findOneAndUpdate({ name: mp.name, merchant_category_id: mp.merchant_category_id }, mp, { upsert: true });
        }
        console.log('merchant products seeded successfully');
    } catch (error) {
        console.error('Error seeding merchant products:', error);
        process.exit(1);
    }
}

module.exports = {
    seedMerchantProducts
};
