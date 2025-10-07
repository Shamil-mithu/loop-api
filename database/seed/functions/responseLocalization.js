const { SystemLocalization, Language } = require('@src/models'); // Import your Mongoose model
const { RESPONSE_ACTION, ARABIC_RESPONSES } = require('../data/response_actions');

async function seedResponsesLocalization() {
    try {
        const language = await Language.findOne({
            code: 'ar'
        })
        if (!language) {
            return 1
            
        }
        const sys_localization = await SystemLocalization.create({
            eid: language.id,
            key: `${language.id}_response_${RESPONSE_ACTION.COULD_NOT_CREATED_TICKET}`,
            value: ARABIC_RESPONSES.COULD_NOT_CREATED_TICKET,
            lang_id : language.id
        })
        if (!sys_localization) {
            console.log('could not create system localization')
        }

    } catch (error) {
        console.error('Error seeding Localization:', error);
        process.exit(1);
    }
}
module.exports = {
    seedResponsesLocalization
}