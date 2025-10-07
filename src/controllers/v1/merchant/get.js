
"use strict";

const { Merchant, MerchantPromotionTag, Category, Facility, Localization, MerchantTag, MerchantType, CustomerBalance, Language, CuisineType, SystemLocalization, StoreLoyalty, MembershipClaim, Rating } = require("@src/models");
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
const haversine = require("haversine");
const { Types } = require("mongoose");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      tag_id: Joi.string().allow(""),
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
      
      console.log('inside protected merchant get all');
      const { tag_id, coordinates } = req.body;
      const customerCoordinates = coordinates;
      let { limit, page } = req.body
      const { customer } = req;
      let filter = {};

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
            is_published: true
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
              {
                $sort: {
                  is_onboarded: -1, // true (1) comes before false (0)
                  distance: 1       // then sort by closest distance
                }
              }, // Sort by nearest merchants
              { $skip: page * limit },
              { $limit: limit }
            ]
          }
        }
      ]);
      const merchants = merchantsAggregation[0].data;
      const totalMerchantDocuments = merchantsAggregation[0].metadata[0]?.total || 0;

      let matchedMerchants;

      if (customer?.default_language?.toString() == defaultSystemLang?._id?.toString()) {
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
            is_onboarded: merchant.is_onboarded,
            listing_image: merchant.listing_image ?? '',
            name: merchant.name,
            logo: merchant.logo ?? '',
            types: await Promise.all(merchantTypes.map(async (x) => {
              if (customer?.default_language?.toString() != defaultSystemLang?._id?.toString()) {
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
            user_balance_formatted_points: '',
            tag_ids: merchant.merchant_tag_ids,
            distance: (merchant.distance < 1) ? `${merchant.distance.toFixed(0) * 1000} m` : `${merchant.distance.toFixed(0)} km`,
            distance_for_sorting: merchant.distance,
            store_loyalties: storeLoyalties,
            rating: sumResult.rating,
            rating_count: sumResult.total_count,
            promotions: promotion,
            delivery_time: merchant.delivery_options.deliveryTime,
            is_membership_claimed: isMembershipClaimed ? true : false,
            latitude: merchant.location.coordinates[1],
            longitude: merchant.location.coordinates[0],
            is_most_loved: merchant.is_most_loved,
          };

          if (customerBalancesBrandIds.includes(merchant.brand_id.toString())) {
            const index = customerBalancesBrandIds.findIndex(id => id === merchant.brand_id.toString());
            matchedMerchant.user_balance_points = customerBalances[index].balance
            matchedMerchant.user_balance_formatted_points = formatCount(customerBalances[index].balance)
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
            is_onboarded: merchant?.is_onboarded ?? false,
            listing_image:
              localizedListingImage?.value ??
              merchant.listing_image ??
              "",
            name: localizedName?.value ?? merchant.name,
            logo: merchant.logo ?? "",
            cashback_percentage: merchant.cashback_percent,
            user_balance_points: 0,
            user_balance_formatted_points: "",
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
            distance: (merchant.distance < 1) ? `${merchant.distance.toFixed(0) * 1000} m` : `${merchant.distance.toFixed(0)} km`,
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
            is_most_loved: merchant.is_most_loved,
          };

          if (customerBalancesBrandIds.includes(merchant._id.toString())) {
            const index = customerBalancesBrandIds.findIndex(id => id === merchant._id.toString());
            matchedMerchant.user_balance_points = customerBalances[index].balance;
            matchedMerchant.user_balance_formatted_points = formatCount(customerBalances[index].balance)

          }
          return matchedMerchant;
        }));
      }

      // uncomment below if any error occurs related to distance sorting
      // matchedMerchants.sort((a, b) => a.distance_for_sorting - b.distance_for_sorting);

      const page_count = +Math.ceil(totalMerchantDocuments / limit)
      const data = {
        meta: { total_document: totalMerchantDocuments, page: page + 1, limit, page_count },
        merchants: matchedMerchants
      }

      return response.send(1, STATUS_CODE.OK, 'merchants list', data, res, null);
    }
    catch (error) {
      console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching merchant list: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        "/merchants",
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch merchant list",
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
 *   name: Merchant
 *   description: Merchant management operations
 */

/**
 * @swagger
 * /v1/merchant/get-all:
 *   post:
 *     summary: Retrieve all merchants
 *     tags: [Merchant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tag_id:
 *                 type: string
 *                 description: Optional tag ID to filter merchants
 *                 example: "605c72f5e4b0c8d07b742af9"
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   longitude:
 *                     type: number
 *                     format: float
 *                     description: Longitude of the customer's location
 *                     example: -73.935242
 *                   latitude:
 *                     type: number
 *                     format: float
 *                     description: Latitude of the customer's location
 *                     example: 40.730610
 *               page:
 *                 type: integer
 *                 description: Page number for pagination (default is 1)
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 description: Number of merchants to return per page (default is 10)
 *                 example: 10
 *     responses:
 *       200:
 *         description: A list of merchants based on the specified filters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of merchants available
 *                   example: 100
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: Number of merchants returned per page
 *                   example: 10
 *                 merchants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Unique identifier of the merchant
 *                         example: "605c72f5e4b0c8d07b742af9"
 *                       listing_image:
 *                         type: string
 *                         description: URL to the merchant's listing image
 *                         example: "http://example.com/image.jpg"
 *                       name:
 *                         type: string
 *                         description: Name of the merchant
 *                         example: "Merchant Name"
 *                       logo:
 *                         type: string
 *                         description: URL to the merchant's logo
 *                         example: "http://example.com/logo.jpg"
 *                       cashback_percentage:
 *                         type: number
 *                         format: float
 *                         description: Cashback percentage offered by the merchant
 *                         example: 5.0
 *                       user_balance_points:
 *                         type: integer
 *                         description: User's balance points for the merchant
 *                         example: 100
 *                       user_balance_formatted_points:
 *                         type: string
 *                         description: Formatted representation of user balance points
 *                         example: "100 points"
 *                       tag_ids:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: List of tag IDs associated with the merchant
 *                         example: ["605c72f5e4b0c8d07b742af9", "605c72f5e4b0c8d07b742af8"]
 *                       distance:
 *                         type: string
 *                         description: Distance from the user's location to the merchant
 *                         example: "2 km"
 *                       distance_for_sorting:
 *                         type: number
 *                         format: float
 *                         description: Numerical distance for sorting purposes
 *                         example: 2.5
 *                       store_loyalties:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                       rating:
 *                         type: number
 *                         format: float
 *                         description: Average rating of the merchant
 *                         example: 4.5
 *                       rating_count:
 *                         type: integer
 *                         description: Total number of ratings for the merchant
 *                         example: 20
 *                       promotions:
 *                         type: object
 *                         description: Latest promotion information for the merchant
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "605c72f5e4b0c8d07b742af9"
 *                           title:
 *                             type: string
 *                             example: "20% off on your first order"
 *                       delivery_time:
 *                         type: string
 *                         description: Estimated delivery time for the merchant
 *                         example: "30-40 minutes"
 *                       is_membership_claimed:
 *                         type: boolean
 *                         description: Indicates if the user has claimed membership for the merchant
 *                         example: true
 *                       latitude:
 *                         type: number
 *                         format: float
 *                         description: Latitude of the merchant's location
 *                         example: 40.730610
 *                       longitude:
 *                         type: number
 *                         format: float
 *                         description: Longitude of the merchant's location
 *                         example: -73.935242
 *       400:
 *         description: Bad request if the input validation fails
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid request body"
 *       401:
 *         description: Unauthorized if authentication fails
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized access"
 *       404:
 *         description: Not found if no merchants are available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No merchants found"
 */
