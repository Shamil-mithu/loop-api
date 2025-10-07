const { FIREBASE_ADMIN: admin } = require('@src/config')

async function sendNotificationCustomer(token, title, body, image ) {

    const message = {
        notification: {
            title: title,
            body: body,
            imageUrl: image,
            // image : image
        },
        token: token,
        data: {
            channelId: '500'
        }
    };

    admin.messaging().send(message)
        .then((response) => {
            console.log('Successfully sent message:', response);

        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

module.exports = {
    sendNotificationCustomer
}