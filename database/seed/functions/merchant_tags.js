"use strict"

const { MerchantTag } = require('@src/models');
const { MERCHANT_TAGS } = require('../data/merchant_tags');

async function seedMerchantTags() {
    try {

        for (const merchantTag of MERCHANT_TAGS) {
            await MerchantTag.findOneAndUpdate({ name: merchantTag.name }, merchantTag, { upsert: true });
        }
        console.log('Merchant Tags seeded successfully');
    } catch (error) {
        console.error('Error seeding Merchant Tags:', error);
        process.exit(1);
    }
}
module.exports = {
    seedMerchantTags
}