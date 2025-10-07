"use strict";

const {
  validate,
  verifyAuth,
  userActionLogger,
  verifyRolesAccess,
} = require("@src/middlewares");
const { response } = require("@src/utils");
const { Joi, Cloudfare } = require("@src/lib");
const { Brand } = require("@src/models");
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
const bodyParser = require("body-parser");
const { CLOUDFARE_ENVIRONMENT, CLOUDFARE_CONTENT_IP } = require("@src/config");
const { saveActivityLog, insertMessageLog } = require("@src/utils");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  verifyAuth(),
  verifyRolesAccess(
    [PERSMISSIONS_TYPES.MERCHANT_MANAGEMENT],
    [PERMISSION_ACTION_TYPES.EDITOR_ACCESS]
  ),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      name: Joi.string().required(),
      currency: Joi.string().required(),
      domain: Joi.string().optional().allow(""),
      email: Joi.string().email().required(),
      default_language: Joi.string().optional().allow(""),
      phone_number: Joi.object()
        .keys({
          code: Joi.string().required(),
          number: Joi.string().required(),
        })
        .required(),
    }),
    params: Joi.object().keys({
      brand_id: Joi.string().required(),
    }),
  }),
  userActionLogger(["updated_by"]),

  async function updateBrandV1Controller(req, res) {
    try {
      const brandData = req.body;
      const { brand_id } = req.params;
      const updatedFields = {};
      const { updated_by } = req.body;

      for (const [key, value] of Object.entries(brandData)) {
        if (value !== "" && value !== null && value !== undefined) {
          updatedFields[key] = value;
        }
      }
      let domainName;
      if (brandData?.domain) {
        domainName =
          CLOUDFARE_ENVIRONMENT == "prod"
            ? `${brandData?.domain}.mithu.com`
            : `${CLOUDFARE_ENVIRONMENT}-${brandData?.domain}.mithu.com`;
        const listRes = await Cloudfare.listDnsRecords();
        let existingDnsRecords = listRes.result;
        for (const record of existingDnsRecords) {
          if (record.name === domainName) {
            return response.send(
              0,
              STATUS_CODE.NOT_ACCEPTABLE,
              "Domain name already in use",
              null,
              res,
              ERROR.DOMAIN_ALREADY_EXIST
            );
          }
        }
      }

      // Check for existing brand only if name is being updated
      const conditions = [];
      if (updatedFields.name) {
        conditions.push({ name: updatedFields.name });
      }
      if (updatedFields?.domain) {
        const domainRes = await Cloudfare.createDnsRecord(
          updatedFields?.domain,
          CLOUDFARE_CONTENT_IP
        );
        if (domainRes.success == true) {
          updatedFields.domain = domainName;
          conditions.push({ domain: domainName });
        } else {
          return response.send(
            0,
            STATUS_CODE.INTERNAL_SERVER_ERROR,
            "error occured while creating domain name",
            null,
            res,
            ERROR.INTERNAL_SERVER_ERROR
          );
        }
      }

      const existingBrand = await Brand.findOne({
        $or: conditions,
        _id: { $ne: brand_id },
        deleted_at: { $exists: false },
      });

      if (existingBrand) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          "Brand with the same name or domain already exists",
          null,
          res,
          ERROR.CONFLICT
        );
      }
      // Updating brand if no conflict is found
      const brand_doc = await Brand.findOneAndUpdate(
        { _id: brand_id },
        { $set: updatedFields },
        { new: false }
      );

      if (!brand_doc) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Brand could not be found",
          null,
          res,
          ERROR.NOT_FOUND
        );
      }

      const updatedDoc = {
        ...brand_doc._doc,
        ...updatedFields,
        id: brand_doc.id,
      };
      await saveActivityLog(
        brand_doc.id,
        MODEL.BRAND,
        brand_doc,
        updatedDoc,
        ACTIVITY_ACTION_TYPE.UPDATE,
        updated_by
      );

      const data = {
        updatedBrand: updatedDoc,
      };

      return response.send(1, STATUS_CODE.OK, "Brand updated", data, res, null);
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while updating brand: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/brand/${req.params.brand_id}`,
        HTTP_VERBS.PUT,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "couldn't update brand",
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
 *   put:
 *     tags: [Brand]
 *     summary: Update brand
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
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               phone_number:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                     example: +1
 *                   number:
 *                     type: string
 *                     example: 1234567890
 *     responses:
 *       '200':
 *         description: B randupdated successfully
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
 *                   example: brand updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedBrand:
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
