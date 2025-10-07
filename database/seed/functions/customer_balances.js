const { CustomerBalance } = require('@src/models');
const { CUSTOMER_BALANCES_DATA } = require('../data/customer_balances');

async function seedCustomerBalances() {
    try {

        for (const cb of CUSTOMER_BALANCES_DATA) {
            await CustomerBalance.findOneAndUpdate({ customerId: cb.customerId }, cb, { upsert: true });
        }
        console.log('customer balances seeded successfully');
    } catch (error) {
        console.error('Error seeding customer balances:', error);
        process.exit(1);
    }
}
module.exports = {
    seedCustomerBalances
}