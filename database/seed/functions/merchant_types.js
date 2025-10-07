"use strict"

const { MerchantType } = require('../../../src/models');
const { MERCHANT_TYPES } = require('../data/merchant_type');

async function seedMerchantTypes() {
    try {

        for (const mt of MERCHANT_TYPES) {
            await MerchantType.findOneAndUpdate({ name: mt.name }, mt, { upsert: true });
        }
        console.log('Merchant Types seeded successfully');
    } catch (error) {
        console.error('Error seeding Merchant Types:', error);
        process.exit(1);
    }
}
module.exports = {
    seedMerchantTypes
}