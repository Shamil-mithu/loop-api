const { google } = require('googleapis');
const WalletAuth = require('../auth/walletAuth');

class PassObjectManager {
  constructor() {
    this.walletAuth = new WalletAuth();
    this.walletobjects = null;
  }

  async initialize() {
    const auth = await this.walletAuth.authenticate();
    this.walletobjects = google.walletobjects({ version: 'v1', auth });
  }

  async createLoyaltyObject(classId, objectId, userEmail) {
    const loyaltyObject = {
      id: `${process.env.ISSUER_ID}.${objectId}`,
      classId: `${process.env.ISSUER_ID}.${classId}`,
      state: 'ACTIVE',
      accountId: userEmail,
      accountName: 'User Name',
      loyaltyPoints: {
        balance: {
          string: '500'
        }
      }
    };

    try {
      const response = await this.walletobjects.loyaltyobject.insert({
        requestBody: loyaltyObject
      });
      console.log('Object created:', response.data);
      return response.data;
    } catch (error) {
      if (error.code === 409) {
        console.log('Object already exists');
        return await this.getLoyaltyObject(objectId);
      }
      throw error;
    }
  }

  async getLoyaltyObject(objectId) {
    const response = await this.walletobjects.loyaltyobject.get({
      resourceId: `${process.env.ISSUER_ID}.${objectId}`
    });
    return response.data;
  }
}

module.exports = PassObjectManager;