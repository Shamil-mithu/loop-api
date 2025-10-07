
const { CustomerTransaction } = require('@src/models'); // Import your Mongoose model
const { CUSTOMER_TRANSACTION_DATA } = require('../data/customer_transaction');

async function seedCustomerTransaction() {
    try {

        for (const ct of CUSTOMER_TRANSACTION_DATA) {
            await CustomerTransaction.findOneAndUpdate({ customer_id: ct.customer_id, merchant_id: ct.merchant_id }, ct, { upsert: true });
        }
        console.log('Customer Transactions eeded successfully');
    } catch (error) {
        console.error('Error seeding Customer Transactions :', error);
        process.exit(1);
    }
}
module.exports = {
    seedCustomerTransaction
}