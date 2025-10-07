require('module-alias/register')
const express = require('express')
require('dotenv').config()

const app = express()
const bodyParser = require('body-parser')
const routes = require("@src/routes");
const passport = require('passport')
const session = require('express-session')
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const { swaggerAuth } = require('@src/middlewares')
const { swaggerDefinition } = require('./swagger')
const swaggerDocs = swaggerJsDoc(swaggerDefinition);
const admin = require("firebase-admin");

const SESSION_SECRET = process.env.SESSION_SECRET
const CORS_ORIGIN = process.env.CORS_ORIGIN
const corsOptions = {
    origin: CORS_ORIGIN,
    optionsSuccessStatus: 200,
};
app.use(
    "/swagger",
    function (req, res, next) {
        let user = swaggerAuth(req);
        if (
            user === undefined ||
            user["name"] !== "admin" ||
            user["pass"] !== "adminpass"
        ) {
            res.statusCode = 401;
            res.setHeader("WWW-Authenticate", 'Basic realm="Node"');
            res.end("Unauthorized");
        } else {
            next();
        }
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs, false, { docExpansion: 'none' })
);

app.use(session({
    secret: SESSION_SECRET,
    name: 'name of session id',
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors(corsOptions));
app.use(passport.initialize());
app.use(passport.session());
app.use(routes)



module.exports = app
