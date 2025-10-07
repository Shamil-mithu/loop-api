const { Currency } = require('@src/models');
const { CURRENCIES } = require('../data/currency');

async function seedCurrencies() {
    try {

        for (const currency of CURRENCIES) {
            await Currency.findOneAndUpdate({ name: currency.name }, currency, { upsert: true });
        }
        console.log('Currencies seeded successfully');
    } catch (error) {
        console.error('Error seeding currencies:', error);
        process.exit(1);
    }
}
module.exports = {
    seedCurrencies
}