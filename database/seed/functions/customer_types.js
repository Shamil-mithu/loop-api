const { CustomerType } = require('../../../src/models'); // Import your Mongoose model
const { CUSTOMER_TYPES_DATA } = require('../data/customer');

async function seedCustomerTypes() {
    try {

        for (const ct of CUSTOMER_TYPES_DATA) {
            await CustomerType.findOneAndUpdate({ name: ct.name }, ct, { upsert: true });
        }
        console.log('Customer Types seeded successfully');
    } catch (error) {
        console.error('Error seeding Customer Types:', error);
        process.exit(1);
    }
}
module.exports = {
    seedCustomerTypes
}