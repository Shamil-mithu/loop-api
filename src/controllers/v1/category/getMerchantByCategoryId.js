
"use strict";

const { Merchant, MerchantPromotionTag, Category, Facility, MerchantTag, MerchantType, CustomerBalance, Language, CuisineType, SystemLocalization, StoreLoyalty, MembershipClaim, Rating } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  MERCHANT_TYPE,
  RATING_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
} = require("@src/constants");
const { response, formatCount, insertMessageLog } = require("@src/utils");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      tag_id: Joi.string().allow(""),
      category_id: Joi.string().allow(""),
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180), // Longitude should be between -180 and 180
        latitude: Joi.number().min(-90).max(90), // Latitude should be between -90 and 90
      }),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).default(10),
    }),
  }),
  async function getAllMerchantsV1Controller(req, res) {
    try {
      const { tag_id, coordinates } = req.body;
      let { category_id } = req.body;
      const customerCoordinates = coordinates;
      let { limit, page } = req.body
      const { customer } = req;
      let filter = {};
      if (!category_id) {
        const category = await Category.findOne({ name: 'Cafes & Restaurants' });
        category_id = category ? [category.id] : [];
      } else if (!Array.isArray(category_id)) {
        category_id = [category_id];
      }

      const defaultSystemLang = await Language.findOne({
        $or: [
          { deleted_at: { $exists: false } },
          { deleted_at: null }
        ],
        code: "en"
      })

      if (tag_id?.length > 0) {
        filter.merchant_tag_ids = tag_id
      }
      const customerBalances = await CustomerBalance.find({ customerId: customer.id });
      const customerBalancesBrandIds = customerBalances.map(balance => balance.reference_id.toString());
      page = page - 1;
      const merchantsAggregation = await Merchant.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [customerCoordinates.longitude, customerCoordinates.latitude] // [lng, lat]
            },
            distanceField: 'distance',
            spherical: true
          }
        },
        {
          $addFields: {
            distance: { $divide: ["$distance", 1000] } // Convert meters to kilometers
          }
        },
        {
          $match: {
            type: MERCHANT_TYPE.DEFAULT,
            $or: [
              { deleted_at: { $exists: false } },
              { deleted_at: null }
            ],
            is_published: true,
            categories: { $in: category_id }
          }
        },
        {
          $addFields: {
            deliveryRadius: { $ifNull: ["$delivery_options.deliveryRadius", 0] } // Default to 0 if not set
          }
        },
        {
          $match: {
            $expr: { $lte: ["$distance", "$deliveryRadius"] } // Ensure merchant is within delivery radius
          }
        },
        {
          $facet: {
            metadata: [{ $count: "total" }], // Count total filtered documents
            data: [
              { $sort: { is_onboarded: -1, distance: 1, } }, // Sort by nearest merchants
              { $skip: page * limit },
              { $limit: limit }
            ]
          }
        }
      ]);
      const merchants = merchantsAggregation[0].data;
      const totalMerchantDocuments = merchantsAggregation[0].metadata[0]?.total || 0;
      let matchedMerchants;

      if (customer?.default_language.toString() == defaultSystemLang._id.toString()) {
        matchedMerchants = await Promise.all(merchants.map(async merchant => {
          const merchantTypes = await MerchantType.find({ "_id": { $in: merchant?.merchant_type_ids }, deleted_at: { $exists: false } });
          const sumResult = await Rating.aggregate([
            {
              $match: {
                merchant_id: new Types.ObjectId(merchant._id),
                status: RATING_STATUS.APPROVED,
                deleted_at: { $exists: false }
              }
            },
            {
              $group: {
                _id: null,
                count: { $sum: "$ratings" },
                total_document: { $count: {} }
              }
            }
          ]).then((result) => {
            if (result[0]?.count)
              return { rating: (result[0].count / result[0].total_document).toPrecision(2), total_count: result[0].total_document };
            else
              return { rating: 0, total_count: 0 };
          });
          const promotion = await MerchantPromotionTag.findOne({
            deleted_at: {
              $exists: false
            },
            merchant_id: merchant._id
          }).sort({ 'created_at': 'desc' })

          const storeLoyalties = await StoreLoyalty.find({
            merchant_id: merchant._id,
            deleted_at: {
              $exists: false
            }
          })

          const isMembershipClaimed = await MembershipClaim.findOne({
            merchant_id: merchant._id,
            customer_id: customer.id
          })

          const matchedMerchant = {
            id: merchant._id,
            listing_image: merchant.listing_image ?? '',
            name: merchant.name,
            logo: merchant.logo ?? '',
            types: await Promise.all(merchantTypes.map(async (x) => {
              if (customer?.default_language.toString() != defaultSystemLang._id.toString()) {
                let localName;
                localName = await SystemLocalization.findOne({
                  key: `${x.id}_merchantType_name`,
                  lang_id: customer?.default_language
                });
                if (localName) x.name = localName.value;
              }
              return x.name;
            })),
            cashback_percentage: merchant.cashback_percent,
            user_balance_points: 0,
            user_balance_formatted_points: "0",
            tag_ids: merchant.merchant_tag_ids,
            distance: merchant.distance.toFixed(0),
            distance_for_sorting: merchant.distance,
            store_loyalties: storeLoyalties,
            rating: sumResult.rating,
            rating_count: sumResult.total_count,
            promotions: promotion,
            delivery_time: merchant.delivery_options.deliveryTime,
            is_membership_claimed: isMembershipClaimed ? true : false,
            latitude: merchant.location.coordinates[1],
            longitude: merchant.location.coordinates[0]
          };

          if (customerBalancesBrandIds.includes(merchant?.reference_id?.toString())) {
            const index = customerBalancesBrandIds.findIndex(id => id === merchant?.reference_id?.toString());
            matchedMerchant.user_balance_points = customerBalances[index]?.balance
            matchedMerchant.user_balance_formatted_points = formatCount(customerBalances[index]?.balance ?? 0)
          }
          return matchedMerchant;
        }));
      }
      else {
        let defaultLang = await Language.findById(customer.default_language)
        matchedMerchants = await Promise.all(merchants.map(async merchant => {
          const sumResult = await Rating.aggregate([
            {
              $match: {
                merchant_id: new Types.ObjectId(merchant._id)
              }
            },
            {
              $group: {
                _id: null,
                count: { $sum: "$ratings" },
                total_document: { $count: {} }
              }
            }
          ]).then((result) => {
            if (result[0]?.count)
              return { rating: (result[0].count / result[0].total_document).toPrecision(2), total_count: result[0].total_document };
            else
              return { rating: 0, total_count: 0 };
          });
          const merchantTypes = await MerchantType.find({ "_id": { $in: merchant?.merchant_type_ids }, deleted_at: { $exists: false } });
          const localizedName = await SystemLocalization.findOne({
            key: `${merchant._id}_merchant_name`,
            lang_id: defaultLang.id
          })

          const localizedListingImage = await SystemLocalization.findOne({
            key: `${merchant._id}_merchant_listingImage`,
            lang_id: defaultLang.id
          })
          const storeLoyalties = await StoreLoyalty.find({
            merchant_id: merchant._id,
            deleted_at: {
              $exists: false
            }
          })

          const localizedLoyalities = await Promise.all(
            storeLoyalties.map(async (entity) => {
              const sysName = await SystemLocalization.findOne({
                eid: entity.id.toString(),
                key: `${entity._id}_storeLoyalty_name`,
                lang_id: customer.default_language,
              });
              const sysTitle = await SystemLocalization.findOne({
                eid: entity._id.toString(),
                key: `${entity._id}_storeLoyalty_title`,
                lang_id: customer.default_language,
              });
              const sysSubTitle = await SystemLocalization.findOne({
                eid: entity._id.toString(),
                key: `${entity._id}_storeLoyalty_sub_title`,
                lang_id: customer.default_language,
              });
              const sysDescription = await SystemLocalization.findOne(
                {
                  eid: entity._id.toString(),
                  key: `${entity._id}_storeLoyalty_description`,
                  lang_id: customer.default_language,
                }
              );
              const sysBgImage = await SystemLocalization.findOne({
                eid: entity._id.toString(),
                key: `${entity._id}_storeLoyalty_background_image`,
                lang_id: customer.default_language,
              });

              if (
                sysName ||
                sysTitle ||
                sysSubTitle ||
                sysDescription ||
                sysBgImage
              ) {
                entity.name = sysName?.value ?? entity.name;
                entity.title = sysTitle?.value ?? entity.title;
                entity.sub_title =
                  sysSubTitle?.value ?? entity.sub_title;
                entity.description =
                  sysDescription?.value ?? entity.description;
                entity.background_image =
                  sysBgImage?.value ?? entity.background_image;
                return entity;
              }
              return entity;
            })
          );

          const isMembershipClaimed = await MembershipClaim.findOne({
            merchant_id: merchant._id,
            customer_id: customer.id,
          });
          const promotion = await MerchantPromotionTag.findOne({
            deleted_at: {
              $exists: false,
            },
            merchant_id: merchant._id,
          }).sort({ created_at: "desc" });

          const matchedMerchant = {
            id: merchant._id,
            listing_image:
              localizedListingImage?.value ??
              merchant.listing_image ??
              "",
            name: localizedName?.value ?? merchant.name,
            logo: merchant.logo ?? "",
            cashback_percentage: merchant.cashback_percent,
            user_balance_points: 0,
            user_balance_formatted_points: "0",
            types: await Promise.all(merchantTypes.map(async (x) => {
              if (customer?.default_language.toString() != defaultSystemLang._id.toString()) {
                let localName
                localName = await SystemLocalization.findOne({
                  key: `${x.id}_merchantType_name`,
                  lang_id: customer?.default_language
                });
                if (localName) x.name = localName.value;
              }
              return x.name;
            })),
            tag_ids: merchant.merchant_tag_ids,
            distance: merchant.distance.toFixed(0),
            distance_for_sorting: merchant.distance,
            store_loyalties: localizedLoyalities,
            promotions: promotion,
            is_membership_claimed: isMembershipClaimed ? true : false,
            delivery_time: merchant.delivery_options.deliveryTime,
            is_membership_claimed: isMembershipClaimed ? true : false,
            latitude: merchant.location.coordinates[1],
            longitude: merchant.location.coordinates[0],
            rating: sumResult.rating,
            rating_count: sumResult.total_count,

          };

          if (customerBalancesBrandIds.includes(merchant.brand_id.toString())) {
            const index = customerBalancesBrandIds.findIndex(id => id === merchant.reference_id.toString());
            matchedMerchant.user_balance_points = customerBalances[index].balance;
            matchedMerchant.user_balance_formatted_points = formatCount(customerBalances[index].balance ?? 0)
          }
          return matchedMerchant;
        }));
      }
      // uncomment below if any error occurs related to distance sorting
      // matchedMerchants.sort((a, b) => a.distance - b.distance);

      const page_count = +Math.ceil(totalMerchantDocuments / limit)
      const data = {
        meta: { total_document: totalMerchantDocuments, page: page + 1, limit, page_count },
        merchants: matchedMerchants
      }

      return response.send(1, STATUS_CODE.OK, 'merchants list', data, res, null);
    } catch (error) {
      // console.log(error.message ?? error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching merchants list by CategoryID : ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/v1/category/merchant",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch merchants list by CategoryID",
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
 *   name: Category
 *   description: APIs for category operations
 */

/**
 * @swagger
 * /v1/category/merchant:
 *   post:
 *     tags: [Category]
 *     summary: Get merchants with optional filtering by category ID, tag ID, or coordinates
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tag_id:
 *                 type: string
 *                 description: ID of the merchant tag (optional)
 *                 example: "60c72b2f5f9b2568a2a08d33"
 *               category_id:
 *                 type: string
 *                 description: ID of the category (optional, defaults to "Restaurant" category if empty)
 *                 example: "60c72b2f5f9b2568a2a08d35"
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   longitude:
 *                     type: number
 *                     description: Longitude for calculating distance from merchants
 *                     example: 12.4924
 *                   latitude:
 *                     type: number
 *                     description: Latitude for calculating distance from merchants
 *                     example: 41.8902
 *               page:
 *                 type: integer
 *                 description: The page number for pagination
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 description: The number of records per page
 *                 example: 10
 *     responses:
 *       200:
 *         description: Successful response with merchants list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total_document:
 *                       type: integer
 *                       description: Total number of merchants found
 *                       example: 50
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       description: Limit of merchants per page
 *                       example: 10
 *                     page_count:
 *                       type: integer
 *                       description: Total number of pages available
 *                       example: 5
 *                 merchants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: ID of the merchant
 *                         example: "60c72b2f5f9b2568a2a08d33"
 *                       name:
 *                         type: string
 *                         description: Name of the merchant
 *                         example: "Merchant A"
 *                       logo:
 *                         type: string
 *                         description: URL of the merchant's logo
 *                         example: "https://example.com/logo.png"
 *                       listing_image:
 *                         type: string
 *                         description: URL of the merchant's listing image
 *                         example: "https://example.com/listing.png"
 *                       cashback_percentage:
 *                         type: number
 *                         description: Cashback percentage offered by the merchant
 *                         example: 5
 *                       distance:
 *                         type: number
 *                         description: Distance from the customer in kilometers
 *                         example: 2
 *                       rating:
 *                         type: number
 *                         description: Average rating of the merchant
 *                         example: 4.5
 *                       rating_count:
 *                         type: integer
 *                         description: Total number of ratings
 *                         example: 100
 *                       promotions:
 *                         type: object
 *                         description: Promotion details for the merchant (if available)
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "promotion_id"
 *                           name:
 *                             type: string
 *                             example: "Summer Sale"
 *                       store_loyalties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "loyalty_id"
 *                             name:
 *                               type: string
 *                               example: "Loyalty Program"
 *                       is_membership_claimed:
 *                         type: boolean
 *                         description: Whether the customer has claimed membership with the merchant
 *                         example: true
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
 *                   example: "Could not fetch data"
 */
