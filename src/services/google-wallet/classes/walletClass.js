// src/services/google-wallet/WalletService.js
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const WalletAuth = require('../auth/walletAuth');
const { GCP_APPLICATION_CREDENTIALS, GCP_ISSUER_ID, GOOGLE_WALLET_PASS_HERO_IMAGE_URL, GOOGLE_WALLET_PASS_LOGO_IMAGE_URL, GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK } = require('@src/config')

class WalletService {
    constructor() {
        this.walletAuth = new WalletAuth();
        this.walletobjects = null;
        this.credentials = null;
    }

    /**
    // initialize the Google Wallet API client only once at the start
    // so remove it from here and call it in the main index.js or server.js file
    */
    async initialize() {
        const auth = await this.walletAuth.authenticate();
        const authClient = await this.walletAuth.getAuthClient();
        this.walletobjects = google.walletobjects({ version: 'v1', auth: authClient });

        // Load credentials for JWT signing
        let credentialPath = GCP_APPLICATION_CREDENTIALS;
        if (!path.isAbsolute(credentialPath)) {
            credentialPath = path.resolve(process.cwd(), credentialPath);
        }
        this.credentials = require(credentialPath);
    }

    /**
     * Create or get loyalty pass class (template)
     */
    async createLoyaltyClass(classId = 'loyalty_class_001') {
        const loyaltyClass = {
            id: `${GCP_ISSUER_ID}.${classId}`,
            issuerName: 'Mithu',
            reviewStatus: 'UNDER_REVIEW',
            programName: 'Mithu Card',
            enableSmartTap: true,
            viewUnlockRequirement: 'UNLOCK_NOT_REQUIRED',
            callbackOptions: {
                url: GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK,
                platformType: 'PLATFORM_TYPE_WEB'
            },
            // Logo
            programLogo: {
                sourceUri: {
                    uri: GOOGLE_WALLET_PASS_LOGO_IMAGE_URL
                },
                contentDescription: {
                    defaultValue: {
                        language: 'en-US',
                        value: 'Mithu Logo'
                    }
                }
            },

            // Hero Image
            heroImage: {
                sourceUri: {
                    uri: GOOGLE_WALLET_PASS_HERO_IMAGE_URL
                },
                contentDescription: {
                    defaultValue: {
                        language: 'en-US',
                        value: 'Mithu Hero Image'
                    }
                }
            },

            // Background color
            hexBackgroundColor: '#ffffff',

            // Card template to display the text modules
            classTemplateInfo: {
                cardTemplateOverride: {
                    cardRowTemplateInfos: [
                        {
                            twoItems: {
                                startItem: {
                                    firstValue: {
                                        fields: [
                                            {
                                                fieldPath: "object.textModulesData['name']"
                                            }
                                        ]
                                    }
                                },
                                endItem: {
                                    firstValue: {
                                        fields: [
                                            {
                                                fieldPath: "object.textModulesData['points']"
                                            }
                                        ]
                                    }
                                }
                            }
                        },
                        {
                            twoItems: {
                                startItem: {
                                    firstValue: {
                                        fields: [
                                            {
                                                fieldPath: "object.textModulesData['orders']"
                                            }
                                        ]
                                    }
                                },
                                endItem: {
                                    firstValue: {
                                        fields: [
                                            {
                                                fieldPath: "object.textModulesData['member_since']"
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    ]
                }
            },
            messages: [
                {
                    header: 'Welcome to Mithu!',
                    body: `You've successfully added your loyalty card. Start earning points now!`,
                    id: 'welcome-message',
                    messageType: 'TEXT_AND_NOTIFY'
                }
            ]
        };

        try {
            const response = await this.walletobjects.loyaltyclass.insert({
                requestBody: loyaltyClass
            });
            console.log('Loyalty class created');
            return response.data;
        } catch (error) {
            if (error.code === 409) {
                console.log('Loyalty class already exists, fetching existing class');
                return await this.getLoyaltyClass(classId);
            }
            console.error('Error creating loyalty class:', error.message);
            throw error;
        }
    }



    /**
     * Get existing loyalty class
     */
    async getLoyaltyClass(classId) {
        try {
            const response = await this.walletobjects.loyaltyclass.get({
                resourceId: `${GCP_ISSUER_ID}.${classId}`
            });
            return response.data;
        } catch (error) {
            console.error('Error getting loyalty class:', error.message);
            throw error;
        }
    }

    /**
     * Create loyalty pass for a specific user
     * This is the main function you'll call for each user
     */
    async createLoyaltyPass(memberData, classId = "loyalty_class_001", objectId = uuidv4(),) {
        const loyaltyObject = {
            id: `${GCP_ISSUER_ID}.${objectId}`,
            classId: `${GCP_ISSUER_ID}.${classId}`,
            state: 'ACTIVE',

            // Account info (Name will be displayed prominently)
            accountName: memberData?.name || 'Shamil',

            // Text modules for the 3 fields that will be displayed via template
            textModulesData: [
                {
                    id: 'name',
                    header: 'NAME',
                    body: memberData?.name || 'Member'
                },
                {
                    id: 'points',
                    header: 'POINTS',
                    body: memberData?.points || 'N/A'
                },
                {
                    id: 'orders',
                    header: 'ORDERS',
                    body: memberData?.orderCount || '0'
                },
                {
                    id: 'member_since',
                    header: 'SINCE',
                    body: memberData?.member_since || '01/01/2024'
                }
            ],
        };

        try {
            const response = await this.walletobjects.loyaltyobject.insert({
                requestBody: loyaltyObject
            });
            console.log('Loyalty object created');
            return response.data;
        } catch (error) {
            if (error.code === 409) {
                console.log('Loyalty object already exists, updating existing object');
                return await this.updateLoyaltyPass(objectId, memberData);
            }
            console.error('Error creating loyalty object:', error.message);
            throw error;
        }
    }
    /**
     * Update existing loyalty pass (for point updates, etc.)
     */
    async updateLoyaltyPass(objectId, classId, memberData) {
        const updateObject = {
            id: `${objectId}`,
            classId: `${GCP_ISSUER_ID}.${classId}`,
            state: 'ACTIVE',

            // Account info (Name will be displayed prominently)
            accountName: memberData?.name || 'Member',

            // Text modules for the 3 fields that will be displayed via template
            textModulesData: [
                {
                    id: 'name',
                    header: 'NAME',
                    body: memberData?.name || 'Member'
                },
                {
                    id: 'points',
                    header: 'POINTS',
                    body: memberData?.points || 'N/A'
                },
                {
                    id: 'orders',
                    header: 'ORDERS',
                    body: memberData?.orderCount || '0'
                },
                {
                    id: 'member_since',
                    header: 'SINCE',
                    body: memberData?.member_since || '01/01/2024'
                }
            ],

        };

        try {
            const response = await this.walletobjects.loyaltyobject.patch({
                resourceId: `${objectId}`,
                requestBody: updateObject
            });
            console.log('Loyalty pass updated');
            return {
                passObject: response.data,
                objectId: objectId,
                fullObjectId: response.data.id
            };
        } catch (error) {
            console.error('Error updating loyalty pass:', error.message);
            throw error;
        }
    }
    async updateLoyaltyPassMessage(objectId, messageId, header, body) {
        try {
            const response = await this.walletobjects.loyaltyobject.patch({
                resourceId: `${GCP_ISSUER_ID}.${objectId}`,
                requestBody: {
                    messages: [
                        {
                            id: messageId,
                            header: header,
                            body: body,
                            messageType: 'TEXT_AND_NOTIFY'
                        }
                    ]
                }
            });

            console.log('Message added/updated and notified');
            return response.data;
        } catch (error) {
            console.error('Error updating message:', error.message);
            throw error;
        }
    }

    /**
     * Generate "Add to Google Wallet" save link
     * This creates the JWT token and returns the save URL
     */
    generateSaveLink(objectId) {
        const payload = {
            iss: this.credentials.client_email,
            aud: 'google',
            typ: 'savetowallet',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60), // Expires in 1 hour
            payload: {
                loyaltyObjects: [{
                    id: objectId
                }]
            }
        };

        const token = jwt.sign(payload, this.credentials.private_key, {
            algorithm: 'RS256'
        });

        const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

        return {
            saveUrl,
            token,
            objectId: `${GCP_ISSUER_ID}.${objectId}`
        };
    }

    /**
     * Complete flow: Create pass class, create pass object, generate save link
     * This is your main function to call
     */
    async createCompletePass(userData, classId = 'loyalty_class_001') {
        try {

            await this.createLoyaltyClass(classId);

            const passResult = await this.createLoyaltyPass(userData, classId);

            const saveLink = this.generateSaveLink(passResult.id);

            return {
                success: true,
                passObject: passResult,
                saveUrl: saveLink.saveUrl,
                objectId: passResult.id,
                token: saveLink.token,
                callback_url: GOOGLE_WALLET_PASS_WEBHOOK_CALLBACK,
                message: 'Loyalty pass created successfully'
            };
        } catch (error) {
            console.error('Error in complete pass creation:', error.message);
            throw error;
        }
    }

    /**
     * Get existing pass object
     */
    async getLoyaltyPass(objectId) {
        try {
            const response = await this.walletobjects.loyaltyobject.get({
                resourceId: `${GCP_ISSUER_ID}.${objectId}`
            });
            return response.data;
        } catch (error) {
            console.error('Error getting loyalty pass:', error.message);
            throw error;
        }
    }

    /**
     * List all passes for debugging
     */
    async listAllPasses(classId = 'loyalty_class_001') {

        try {
            const response = await this.walletobjects.loyaltyobject.list({
                classId: `${GCP_ISSUER_ID}.${classId}`,
            });
            return response.data.resources || [];
        } catch (error) {
            console.error('Error listing passes:', error.message);
            throw error;
        }
    }
}

module.exports = WalletService;