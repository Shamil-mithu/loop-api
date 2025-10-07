const jwt = require('jsonwebtoken');
const { GCP_ISSUER_ID } = require("@src/config");
class JWTGenerator {
  constructor() {
    this.credentials = require(require('path').resolve(GOOGLE_APPLICATION_CREDENTIALS));
  }

  generateSaveLink(objectId) {
    const payload = {
      iss: this.credentials.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyObjects: [{
          id: `${GCP_ISSUER_ID}.${objectId}`
        }]
      }
    };

    const token = jwt.sign(payload, this.credentials.private_key, { algorithm: 'RS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
  }
}

module.exports = JWTGenerator;