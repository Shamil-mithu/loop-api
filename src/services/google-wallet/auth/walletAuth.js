const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { GCP_APPLICATION_CREDENTIALS } = require('@src/config')

class WalletAuth {
    constructor() {

        // Get the credential path
        let credentialPath = GCP_APPLICATION_CREDENTIALS;

        // If it's a relative path, resolve it from the project root
        if (!path.isAbsolute(credentialPath)) {
            credentialPath = path.resolve(process.cwd(), credentialPath);
        }

        // Check if file exists
        if (!require('fs').existsSync(credentialPath)) {
            throw new Error(`Credential file not found at: ${credentialPath}`);
        }

        this.credentials = require(credentialPath);
        this.auth = null;
        this.authenticate();
        this.keyFilePath = credentialPath;

    }

    async authenticate() {
        try {
            this.auth = new google.auth.GoogleAuth({
                credentials: this.credentials,
                keyFile: this.keyFilePath,
                scopes: ['https://www.googleapis.com/auth/wallet_object.issuer']
            });

            return this.auth;
        } catch (error) {
            console.error('Authentication failed:', error.message);
            throw error;
        }
    }

    async getAuthClient() {
        if (!this.auth) {
            await this.authenticate();
        }
        return await this.auth.getClient();
    }
}

module.exports = WalletAuth;