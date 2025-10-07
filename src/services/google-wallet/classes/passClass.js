const { google } = require('googleapis');
const WalletAuth = require('../auth/walletAuth');

class PassClassManager {
  constructor() {
    this.walletAuth = new WalletAuth();
    this.walletobjects = null;
  }

  async initialize() {
    const auth = await this.walletAuth.authenticate();
    this.walletobjects = google.walletobjects({ version: 'v1', auth });
  }

  async createLoyaltyClass(classId, className) {
    const loyaltyClass = {
      id: `${process.env.ISSUER_ID}.${classId}`,
      issuerName: 'Your Company Name',
      reviewStatus: 'UNDER_REVIEW',
      programName: className,
      programLogo: {
        sourceUri: {
          uri: 'https://your-domain.com/logo.png' // Your logo URL
        }
      }
    };

    try {
      const response = await this.walletobjects.loyaltyclass.insert({
        requestBody: loyaltyClass
      });
      console.log('Class created:', response.data);
      return response.data;
    } catch (error) {
      if (error.code === 409) {
        console.log('Class already exists');
        return await this.getLoyaltyClass(classId);
      }
      throw error;
    }
  }

  async getLoyaltyClass(classId) {
    const response = await this.walletobjects.loyaltyclass.get({
      resourceId: `${process.env.ISSUER_ID}.${classId}`
    });
    return response.data;
  }
}

module.exports = PassClassManager;