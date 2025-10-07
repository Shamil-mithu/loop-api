// walletServiceInstance.js
const WalletService = require('./classes/walletClass');

const walletService = new WalletService();

const initializeWalletService = async () => {
    await walletService.initialize();
    console.log("Google Wallet Service initialized successfully.");
};

module.exports = {
    walletService,
    initializeWalletService
};
