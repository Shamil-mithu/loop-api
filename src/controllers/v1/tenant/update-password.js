"use strict";

const { Brand } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate, multerUpload, deleteUploadedFilesOnError, userActionLogger, verifyRolesAccess } = require("@src/middlewares");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const {
  STATUS_CODE,
  ERROR,
  PERSMISSIONS_TYPES,
  PERMISSION_ACTION_TYPES,
  MODEL,
  ACTIVITY_ACTION_TYPE,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response } = require('@src/utils');
const { saveActivityLog, insertMessageLog } = require("@src/utils");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  verifyRolesAccess(
    [PERSMISSIONS_TYPES.MERCHANT_MANAGEMENT],
    [PERMISSION_ACTION_TYPES.EDITOR_ACCESS]
  ),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      password: Joi.string().required(),
      confirmPassword: Joi.string().required(),
    }),
    params: Joi.object().keys({
      brand_id: Joi.string().required(),
    }),
  }),
  userActionLogger(["updated_by"]),
  async function updateBrandPasswordV1Controller(req, res) {
    try {
      const { brand_id } = req.params;
      const { password, confirmPassword, updated_by } = req.body;

      if (password !== confirmPassword) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          `password and confirmPassword doesn't match`,
          null,
          res,
          ERROR.BAD_REQUEST
        );
      }

      // Encrypt Password
      const salt = await bcrypt.genSalt(10);
      const encryptedPassword = await bcrypt.hash(password, salt);

      const updatedBrand = await Brand.findOneAndUpdate(
        { _id: brand_id },
        { $set: { password: encryptedPassword } },
        { upsert: true, new: false }
      );

      if (!updatedBrand) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Brand not found",
          null,
          res,
          ERROR.NOT_FOUND
        );
      }
      const updatedBrandDoc = {
        ...updatedBrand.toObject(),
        password: encryptedPassword,
        id: updatedBrand.id,
      };
      await saveActivityLog(
        updatedBrand.id,
        MODEL.BRAND,
        updatedBrand,
        updatedBrandDoc,
        ACTIVITY_ACTION_TYPE.UPDATE,
        updated_by
      );

      const data = {
        updatedBrandDoc,
      };

      return response.send(
        1,
        STATUS_CODE.OK,
        "Brand password updated",
        data,
        res,
        null
      );
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating brand password: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/brand/update-password/${req.params.brand_id}`,
        HTTP_VERBS.PUT,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't update brand password",
        null,
        res,
        error
      );
    }
  },
];

// -----------------------------------------EXPORTS---------------------------------------------------------
module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Brand
 *   description: APIs for Brand operations
 */

/**
 * @swagger
 * /v1/brand/update-password/{brand_id}:
 *   put:
 *     tags: [Brand]
 *     summary: Update brand password
 *     parameters:
 *       - in: path
 *         name: brand_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the brand to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 example: password123
 *               confirmPassword:
 *                 type: string
 *                 example: password123
 *     responses:
 *       '200':
 *         description: Brand password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: brand password updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     updateduser:
 *                       $ref: '#/components/schemas/Brand'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: Bad request
 *                 data:
 *                   type: null
 *                 errors:
 *                   type: object
 *                   description: Detailed error information
 *       '404':
 *         description: Brand not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: Brand card not found
 *                 data:
 *                   type: null
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 0
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 data:
 *                   type: null
 *                 errors:
 *                   type: object
 *                   description: Detailed error information
 */

