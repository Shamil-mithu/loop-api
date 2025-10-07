"use strict";

const {
  verifyAuth,
  validate,
  userActionLogger,
  verifyRolesAccess,
} = require("@src/middlewares");
const { response } = require("@src/utils");
const { Joi } = require("@src/lib");
const { Brand } = require("@src/models");
const {
  STATUS_CODE,
  PERSMISSIONS_TYPES,
  PERMISSION_ACTION_TYPES,
  MODEL,
  ACTIVITY_ACTION_TYPE,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const bodyParser = require("body-parser");
const { saveActivityLog, insertMessageLog } = require("@src/utils");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  verifyAuth(),
  verifyRolesAccess(
    [PERSMISSIONS_TYPES.MERCHANT_MANAGEMENT],
    [PERMISSION_ACTION_TYPES.FULL_ACCESS]
  ),
  bodyParser.json(),
  validate({
    params: Joi.object()
      .keys({
        brand_id: Joi.string().required(),
      })
      .required(),
  }),
  userActionLogger(["deleted_by"]),
  async function deleteBrandV1Controller(req, res) {
    try {
      const { brand_id } = req.params;
      const { deleted_by } = req.body;
      const deletedBrand = await Brand.findOneAndUpdate(
        {
          _id: brand_id,
        },
        {
          deleted_at: Date.now(),
          deleted_by,
        },
        { new: true }
      );

      if (!deletedBrand) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          "Brand already deleted or does not exist",
          data,
          res,
          null
        );
      }

      const existing_data = { ...deletedBrand._doc };
      delete existing_data.deleted_at;
      delete existing_data.deleted_by;

      await saveActivityLog(
        deletedBrand.id,
        MODEL.BRAND,
        existing_data,
        deletedBrand,
        ACTIVITY_ACTION_TYPE.DELETE,
        deleted_by
      );

      const data = {
        deletedBrand,
      };

      return response.send(1, STATUS_CODE.OK, "Brand deleted", data, res, null);
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while deleting brand: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/brand/${req.params.brand_id}`,
        HTTP_VERBS.DELETE,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't delete brand",
        null,
        res,
        error
      );
    }
  },
];

// ------------------------- Exports ----------------------------

module.exports = CONTROLLER;

/**
 * @swagger
 * tags:
 *   name: Brand
 *   description: APIs for Brand operations
 */

/**
 * @swagger
 * /v1/brand/{brand_id}:
 *   delete:
 *     tags: [Brand]
 *     summary: Delete a Brand
 *     parameters:
 *       - in: path
 *         name: brand_id
 *         schema:
 *           type: string
 *           required: true
 *           description: The ID of brand to delete
 *     responses:
 *       '200':
 *         description: Brand deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: brand deleted
 *       '400':
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid Brand ID
 *       '404':
 *         description: Brand not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Brand not found
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Could not delete brand
 */

