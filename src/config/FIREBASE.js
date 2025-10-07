const admin = require("firebase-admin");
var  SERVICE_ACCOUNT_KEY  = require('@src/config/SERVICE_ACCOUNT_KEY.json');

admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT_KEY)
});

module.exports = admin