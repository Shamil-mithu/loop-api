const { Localization } = require('@src/models'); // Import your Mongoose model
const { LOCALIZATIONS } = require('../data/localization');

async function seedLocalization() {
    try {
        for (const local of LOCALIZATIONS) {
            console.log(local)
            await Localization.findOneAndUpdate({ key: local.key, lang_id: local.lang_id }, {
                key: local.key,
                value: local.value,
                lang_id: local.lang_id
            }, { upsert: true });
        }
        console.log('Localization seeded successfully');
    } catch (error) {
        console.error('Error seeding Localization:', error);
        process.exit(1);
    }
}
module.exports = {
    seedLocalization
}