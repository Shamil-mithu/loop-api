"use strict";

const { name, version } = require("@root/package.json");

const CONTROLLER = [
  function get(req, res) {
    res.json({
      name,
      version,
    });
  },
];

module.exports = CONTROLLER;

/**
 * @swagger
 *
 * /:
 *   get:
 *     tags:
 *       - Information
 *     description: Get API name and version
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: The API name and version
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - name
 *                 - version
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "@btcex/api"
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *       500:
 *         $ref: "#/responses/500"
 */
