"use strict";

const bodyParser = require("body-parser");
const prisma = require('../../../../prisma/prisma-client')
const { response } = require('../../../utils')
const jwt = require('jsonwebtoken')
const SECRET_KEY = process.env.JWT_AUTH_SECRET;

//------------------------CONTROLLER----------------------------

const CONTROLLER = [
    bodyParser.json(),
    async function updateAccessTokenV1Controller(req, res) {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return response.send(0, 400, 'Missing Refresh Token', null, res, null);
        }

        try {
            const decoded = jwt.verify(refresh_token, SECRET_KEY);
            // Attach decoded username to request object
            req.id = decoded.id;
            const id = req.id;
            const access_token = jwt.sign({ id }, SECRET_KEY, { expiresIn: '1h' });

            const data = await prisma.tokens.create({
                data: {
                    user_id: id,
                    access_token: access_token,
                    refresh_token: refresh_token
                },
                select: {
                    access_token: true,
                    refresh_token: true,
                    user_id : true,

                }
            });
            response.send(1, 200, "Token refreshed successfully", data, res, null);
        } catch (error) {
            console.log(error.message)
            if (error instanceof jwt.JsonWebTokenError) {
                // Specific handling for JWT errors
                return response.send(0, 401, error.message, null, res, error);
            } else {
                // General error handling
                return response.send(0, 500, 'An error occurred', null, res, error);
            }
        }
    },
];

//--------------------------EXPORTS---------------------------

module.exports = CONTROLLER;
