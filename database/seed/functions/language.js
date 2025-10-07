const { Language } = require('@src/models'); // Import your Mongoose model
const { LANGUAGES } = require('../data/languages');

async function seedLanguages() {
    try {
        for (const lan of LANGUAGES) {
            await Language.findOneAndUpdate({ name: lan.name }, lan ,{ upsert: true });
        }
        console.log('Languages seeded successfully');
    } catch (error) {
        console.error('Error seeding Languages:', error);
        process.exit(1);
    }
}
module.exports = {
    seedLanguages
}