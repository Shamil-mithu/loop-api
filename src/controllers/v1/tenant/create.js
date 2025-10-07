"use strict";

const {
  validate,
  verifyAuth,
  userActionLogger,
  verifyRolesAccess,
} = require("@src/middlewares");
const { response, generateUniqueMerchantCode } = require("@src/utils");
const { Joi } = require("@src/lib");
const { Tenant } = require("@src/models");
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
const { saveActivityLog, insertMessageLog } = require("@src/utils");

// ------------------------- Controller -------------------------

const CONTROLLER = [
  // verifyAuth(),
  // verifyRolesAccess(
  //   [PERSMISSIONS_TYPES.TENANT_MANAGEMENT],
  //   [PERMISSION_ACTION_TYPES.FULL_ACCESS]
  // ),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      default_language: Joi.string().optional().allow(""),
      phone_number: Joi.object()
        .keys({
          code: Joi.string().required(),
          number: Joi.string().required(),
        })
        .required(),
    }),
  }),
  userActionLogger(["created_by", "updated_by"]),
  async function createTenantV1Controller(req, res) {
    try {
      const {
        name,
        email,
        phone_number,
        default_language,
        created_by,
        updated_by,
      } = req.body;

      const existingTenant = await Tenant.findOne({
        $or: [{ name }, { email }],
        deleted_at: { $exists: false, $eq: null },
      });

      if (existingTenant) {
        return response.send(
          0,
          STATUS_CODE.CONFLICT,
          "Tenant with the same name or email already exists",
          null,
          res,
          ERROR.CONFLICT
        );
      }

      const tenant_data = {
        name,
        email,
        phone_number,
        default_language,
        created_by,
        updated_by,
      };

      tenant_data.unique_code = await generateUniqueMerchantCode(Tenant);

      const newTenant = await Tenant.create(tenant_data);

      if (!newTenant) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Tenant could not be created",
          null,
          res,
          ERROR.NOT_FOUND
        );
      }

      await saveActivityLog(
        newTenant.id,
        MODEL.TENANT,
        null,
        newTenant,
        ACTIVITY_ACTION_TYPE.CREATE,
        updated_by
      );

      return response.send(1, STATUS_CODE.OK, "Tenant created", newTenant, res, null);
    } catch (error) {
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while creating tenant: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/tenant/create",
        HTTP_VERBS.POST,
        req?.user?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't create tenant",
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
 *   name: Tenant
 *   description: APIs for Tenant operations
 */

/**
 * @swagger
 * /v1/tenant/create:
 *   post:
 *     tags: [Tenant]
 *     summary: Create new tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tenant A
 *               email:
 *                 type: string
 *                 format: email
 *                 example: tenant@example.com
 *               phone_number:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                     example: +1
 *                   number:
 *                     type: string
 *                     example: 9876543210
 *     responses:
 *       200:
 *         description: Tenant created Successfully
 *       400:
 *         description: Bad Request - tenant already exists
 *       500:
 *         description: Internal Server Error
 */
