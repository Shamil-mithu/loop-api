const swaggerDefinition = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Mithu App API",
      description: "",
      version: "1.0.0",
      contact: {
        email: "info@mithu.com",
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        APIKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        APIKeyAuth: [],
      },
    ],
  },

  apis: [
    "./src/controllers/auth/interaction/*.js",
    "./src/controllers/auth/customer/*.js",
    "./src/controllers/v1/category/*.js",
    "./src/controllers/v1/customer/*.js",
    "./src/controllers/v1/faq/*.js",
    "src/controllers/v1/language/*.js",
    "src/controllers/v1/localization/*.js",
    "./src/controllers/v1/merchant/*.js",
    "./src/controllers/v1/notification/*.js",
    "src/controllers/v1/public_repo/*.js",
    "./src/controllers/v1/rating/*.js",
    "./src/controllers/v1/region/*.js",
    "./src/controllers/v1/slider/*.js",
    "src/controllers/v1/membershipLoyalty/*.js",
    "./src/controllers/v1/ticket/*.js",
    "./src/controllers/v1/transaction/*.js",
    "./src/controllers/v1/store/*.js",
    "./src/controllers/v1/currency/*.js",
    "./src/controllers/v1/gamification/*.js",
    "./src/controllers/v1/engineRule/*.js",
    "./src/controllers/v1/manualReceipt/*.js",
    "./src/controllers/v1/pass/*.js",
    "./src/controllers/v1/webhook/walletPass/apple/*.js",
    "./src/controllers/v1/webhook/walletPass/google/*.js",
    "./src/controllers/v1/web/public/merchant/*.js",
    "./src/controllers/v1/web/public/category/*.js",
    "./src/controllers/v1/web/public/slider/*.js",
    "./src/controllers/v1/web/public/store/*.js",
  ],
};

module.exports = {
  swaggerDefinition
}
