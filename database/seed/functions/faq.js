const { FAQ } = require('@src/models'); // Import your Mongoose model
const { FAQs } = require('../data/faq');

async function seedFAQs() {
    try {
        for (const faq of FAQs) {
            await FAQ.findOneAndUpdate({ title: faq.title }, faq, { upsert: true });
        }
        console.log('FAQs seeded successfully');
    } catch (error) {
        console.error('Error seeding FAQs:', error);
        process.exit(1);
    }
}
module.exports = {
    seedFAQs
}