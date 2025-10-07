const { TransactionSource } = require('@src/models');
const { TRANSACTION_SOURCES } = require('../data/transaction_sources');

async function seedTransactionSource() {
    try {

        for (const ts of TRANSACTION_SOURCES) {

            await TransactionSource.findOneAndUpdate({ name: ts.name, source_type: ts.source_type }, ts, { upsert: true });
        }
        console.log('Transaction Sources seeded successfully');

    } catch (error) {
        console.error('Error seeding Transaction Sources:', error);
        process.exit(1);
    }
}
module.exports = {
    seedTransactionSource
}