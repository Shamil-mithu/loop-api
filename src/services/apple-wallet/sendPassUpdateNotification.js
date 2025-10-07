const apn = require('apn');

const { APPLE_TEAM_IDENTIFIER, APPLE_APN_KEY_ID, APPLE_APN_KEY_PATH, APPLE_PASS_TYPE_IDENTIFIER } = require('@src/config');
const { AppleWalletPass } = require('@src/models');

const sendPassUpdateNotification = async (deviceToken) => {

    // Check if the device token is valid
    if (!deviceToken) {
        console.error('Invalid device token provided');
        return;
    }
    const pass = await AppleWalletPass.findOneAndUpdate({
        push_token: deviceToken,
        pass_type_identifier: APPLE_PASS_TYPE_IDENTIFIER,
        is_deleted: false,
        is_active: true,
    }, {
        updated_at: new Date(),
        last_updated_from_server: new Date(),
    }, {
        new: true
    })

    if (!pass) {
        console.error('Pass not found for the given device token');
        return;
    }
    const apnProvider = new apn.Provider({
        token: {
            key: APPLE_APN_KEY_PATH,
            keyId: APPLE_APN_KEY_ID,
            teamId: APPLE_TEAM_IDENTIFIER
        },
        production: true
    });

    const note = new apn.Notification();
    note.topic = APPLE_PASS_TYPE_IDENTIFIER;
    note.pushType = 'background';
    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.payload = {
        aps: {
            'content-available': 1
        }
    };

    const result = await apnProvider.send(note, deviceToken);
    console.log(result);
    apnProvider.shutdown();
};

module.exports = sendPassUpdateNotification 