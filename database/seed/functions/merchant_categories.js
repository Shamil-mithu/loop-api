const { MerchantCategory } = require('@src/models');
const { MERCHANT_CATEGORIES } = require('../data/merchant_categories');

async function seedMerchantCategories() {
    try {

        for (const mc of MERCHANT_CATEGORIES) {
            await MerchantCategory.findOneAndUpdate({ name: mc.name, merchant_id: mc.merchant_id }, mc, { upsert: true });
        }
        console.log('merchant categories seeded successfully');
    } catch (error) {
        console.error('Error seeding merchant categories:', error);
        process.exit(1);
    }
}
module.exports = {
    seedMerchantCategories
}