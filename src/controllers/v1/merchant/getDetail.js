"use strict";

const { Merchant, MerchantType, MerchantPromotionTag, Facility, StoreLoyalty, MembershipClaim, CustomerBalance, CustomerTransaction, Currency, Rating, Language, SystemLocalization, CustomerClassification, CuisineType, MerchantTag } = require("@src/models");
const { Joi } = require("@src/lib");
const { verifyAuth, validate } = require("@src/middlewares");
const bodyParser = require("body-parser");
const {
  STATUS_CODE,
  TRANSACTION_SOURCE_TYPE,
  RATING_STATUS,
  LOG_TYPE,
  HTTP_VERBS,
  COLLECTION,
  MERCHANT_TYPE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
} = require("@src/constants");
const {
  response,
  formatMerchantCode,
  formatCount,
  insertMessageLog,
} = require("@src/utils");
const haversine = require("haversine");
const { Types } = require("mongoose");
const moment = require("moment");

// -----------------------------------------CONTROLLER---------------------------------------------------------

const CONTROLLER = [
  verifyAuth(),
  bodyParser.json(),
  validate({
    body: Joi.object().keys({
      coordinates: Joi.object().keys({
        longitude: Joi.number().min(-180).max(180), // Longitude should be between -180 and 180
        latitude: Joi.number().min(-90).max(90), // Latitude should be between -90 and 90
      }),
    }),
    params: Joi.object().keys({
      merchantId: Joi.string().required(), // Validate merchant ID from params
    }),
  }),
  async function getMerchantDetailV1Controller(req, res) {
    try {
      const { merchantId } = req.params; // Extract merchant ID from params
      const { coordinates } = req.body;
      const customerCoordinates = coordinates;
      const { customer } = req;

      const defaultSystemLang = await Language.findOne({
        code: "en",
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });

      // Find merchant by ID
      const merchant = await Merchant.findOne({
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
        _id: merchantId,
      });
      if (!merchant) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Merchant not found",
          null,
          res,
          null
        );
      }

      const storeLoyalty = await StoreLoyalty.find({
        merchant_id: merchant.id,
        deleted_at: { $exists: false },
      });
      const membershipClaim = await MembershipClaim.findOne({
        customer_id: customer.id,
        merchant_id: merchant.id,
      }).sort({ created_at: -1 });
      let formattedDate;
      if (membershipClaim) {
        const day = String(membershipClaim.created_at.getDate()).padStart(
          2,
          "0"
        );
        const month = String(
          membershipClaim.created_at.getMonth() + 1
        ).padStart(2, "0");
        const year = membershipClaim.created_at.getFullYear();
        formattedDate = `${day}.${month}.${year}`;
      }

      const currency = await Currency.findOne({
        code: merchant.currency,
        $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
      });
      if (!currency) {
        return response.send(
          0,
          STATUS_CODE.NOT_FOUND,
          "Currency not found",
          null,
          res,
          null
        );
      }
      const pointRate = currency.point_rate;

      // Calculate the sum and average rating using aggregation
      const sumResult = await Rating.aggregate([
        {
          $match: {
            merchant_id: new Types.ObjectId(merchantId),
            status: RATING_STATUS.APPROVED,
            deleted_at: { $exists: false },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: "$ratings" },
            total_document: { $count: {} },
          },
        },
      ]).then((result) => {
        if (result[0]?.count)
          return {
            rating: (result[0].count / result[0].total_document).toPrecision(2),
            total_count: result[0].total_document,
          };
        else return { rating: 0, total_count: 0 };
      });

      const transactions = await CustomerTransaction.aggregate([
        {
          $match: {
            customer_id: new Types.ObjectId(customer.id),
            transaction_type: TRANSACTION_SOURCE_TYPE.EARNING,
            entity_id: new Types.ObjectId(merchant.id),
            points_type: TRANSACTION_TYPE.MERCHANT,
            $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }],
          },
        },
        {
          $group: {
            _id: null,
            point: { $sum: "$points" },
          },
        },
      ]).then((result) => {
        if (result[0]?.point) return { points: result[0].point };
        else return { points: 0 };
      });

      const classification = await CustomerClassification.findOne({
        points: { $gt: transactions.points },
        deleted_at: { $exists: false },
      })
        .sort({ points: 1 })
        .exec();

      const lowClassification = await CustomerClassification.findOne({
        points: { $lte: transactions.points },
        deleted_at: { $exists: false },
      })
        .sort({ points: -1 })
        .exec();

      // Check if the store is open or close
      const currentDateTime = new Date();
      const options = {
        weekday: "long",
        timeZone: merchant.timeZone,
        hour12: false,
      };
      const day = currentDateTime.toLocaleDateString("en-US", options);
      delete options.weekday;
      const time = currentDateTime.toLocaleTimeString("en-US", options);

      const operationalHours = merchant.operational_hours[day];

      let isOff =
        operationalHours.isOff ||
        !(
          (time >= operationalHours.opening_time ||
            operationalHours.opening_time == "00:00") &&
          (time <= operationalHours.closing_time ||
            operationalHours.closing_time == "00:00")
        );

      const merchantTypes = await MerchantType.find({
        _id: { $in: merchant?.merchant_type_ids },
        deleted_at: { $exists: false },
      });
      const cuisineTypes = await CuisineType.find({
        _id: { $in: merchant?.cuisine_type_ids },
        deleted_at: { $exists: false },
      });
      const facilities = await Facility.find({
        _id: { $in: merchant?.facilities },
        deleted_at: { $exists: false },
      });
      const merchantTags = await MerchantTag.find({
        _id: { $in: merchant?.merchant_tag_ids },
        deleted_at: { $exists: false },
      });
      let promotions = await MerchantPromotionTag.find({
        merchant_id: merchant.id,
        deleted_at: { $exists: false },
      }).sort({ created_at: "desc" });
      let is_read;
      promotions = await Promise.all(
        promotions.map(async (promotion) => {
          if (!promotion.read_by?.includes(customer.id)) {
            is_read = false;
          } else {
            is_read = true;
          }
          return (promotion = {
            ...promotion._doc,
            id: promotion.id,
            is_read: is_read,
          });
        })
      );
      const merchantCoordinates = merchant.location.coordinates;
      const start = {
        latitude: customerCoordinates.latitude,
        longitude: customerCoordinates.longitude,
      };
      const end = {
        latitude: merchantCoordinates[1],
        longitude: merchantCoordinates[0],
      };
      const distance = haversine(start, end, { unit: "km" });

      // Check if customer has balance with this merchant
      const customerBalance = await CustomerBalance.findOne({
        customerId: customer.id,
        reference_id: merchant.brand_id,
        reference_type: COLLECTION.BRAND,
      });
      const isBalance = customerBalance?.balance ?? 0;
      const currencyRate = isBalance * currency.point_rate;
      let latest_promotion = promotions[0];

      if (latest_promotion)
        latest_promotion = {
          ...latest_promotion,
          is_read: latest_promotion.is_read,
          formatted_created_at: latest_promotion.created_at.toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            }
          ),
        };

      let localDesc,
        localName,
        localCoverImg,
        localListingImg,
        localAddress,
        localPhone,
        shortDescLocale,
        deliveryOptionsAvailable = "",
        localDeliveryOptionsAvailable = "";
      if (
        customer?.default_language.toString() !=
        defaultSystemLang._id.toString()
      ) {
        const promoTitle = await SystemLocalization.findOne({
          key: `${latest_promotion?._id}_merchantPromotion_title`,
          lang_id: customer?.default_language,
        });
        shortDescLocale = await SystemLocalization.findOne({
          key: `${merchant?.id}_merchant_short_description`,
          lang_id: customer?.default_language,
        });
        if (promoTitle) latest_promotion.title = promoTitle.value;
        const promoDescription = await SystemLocalization.findOne({
          key: `${latest_promotion?._id}_merchantPromotion_description`,
          lang_id: customer?.default_language,
        });
        if (promoDescription)
          latest_promotion.description = promoDescription.value;
        localName = await SystemLocalization.findOne({
          key: `${merchant.id}_merchant_name`,
          lang_id: customer?.default_language,
        });
        localDesc = await SystemLocalization.findOne({
          key: `${merchant.id}_merchant_description`,
          lang_id: customer?.default_language,
        });
        localCoverImg = await SystemLocalization.findOne({
          key: `${merchant.id}_merchant_coverImage`,
          lang_id: customer?.default_language,
        });
        localListingImg = await SystemLocalization.findOne({
          key: `${merchant.id}_merchant_listingImage`,
          lang_id: customer?.default_language,
        });
        localAddress = await SystemLocalization.findOne({
          key: `${merchant.id}_merchant_address`,
          lang_id: customer?.default_language,
        });
        localPhone = await SystemLocalization.findOne({
          key: `${merchant.id}_merchant_phone`,
          lang_id: customer?.default_language,
        });
        if (isOff) {
          const localDelivery = await SystemLocalization.findOne({
            key: `${merchant.id}_merchant_deliveryOptionsAvailableOn`,
            lang_id: customer?.default_language,
          });
          localDeliveryOptionsAvailable = localDelivery?.value;
          deliveryOptionsAvailable = "Close";
          if (!localDeliveryOptionsAvailable)
            localDeliveryOptionsAvailable = deliveryOptionsAvailable;
        } else {
          const localDelivery = await SystemLocalization.findOne({
            key: `${merchant.id}_merchant_deliveryOptionsAvailableOff`,
            lang_id: customer?.default_language,
          });
          localDeliveryOptionsAvailable = localDelivery?.value;
          deliveryOptionsAvailable = "Open";
          if (!localDeliveryOptionsAvailable)
            localDeliveryOptionsAvailable = deliveryOptionsAvailable;
        }
      }
      if (isOff) deliveryOptionsAvailable = "Close";
      else deliveryOptionsAvailable = "Open";

      const isMembershipClaimed = await MembershipClaim.findOne({
        merchant_id: merchant.id,
        customer_id: customer.id,
      });

      const merchantDetail = {
        id: merchant.id,
        is_onboarded : merchant.is_onboarded,
        logo: merchant.logo ?? "",
        listing_image: localListingImg?.value ?? merchant.listing_image ?? "",
        cover_image: localCoverImg?.value ?? merchant.cover_image ?? "",
        store_loyalty: storeLoyalty,
        membership_claim: {
          card_number: membershipClaim?.card_number,
          image: membershipClaim?.token_uri,
          name: membershipClaim?.name,
          created_at: formattedDate,
        },
        name: localName?.value ?? merchant.name,
        cashback_percentage: merchant.cashback_percent,
        user_balance_points: customerBalance ? customerBalance.balance : 0,
        user_balance_formatted_points: customerBalance
          ? formatCount(customerBalance.balance) ?? "0"
          : 0,
        user_balance_value: currencyRate,
        latest_promotion: latest_promotion,
        promotions: await Promise.all(
          promotions.map(async (x) => {
            if (
              customer?.default_language.toString() !=
              defaultSystemLang._id.toString()
            ) {
              const localName = await SystemLocalization.findOne({
                key: `${x._id}_merchantPromotion_title`,
                lang_id: customer?.default_language,
              });
              if (localName) x.title = localName.value;

              const localDesc = await SystemLocalization.findOne({
                key: `${x._id}_merchantPromotion_description`,
                lang_id: customer?.default_language,
              });
              if (localDesc) x.description = localDesc.value;

              const localimg = await SystemLocalization.findOne({
                key: `${x._id}_merchantPromotion_image`,
                lang_id: customer?.default_language,
              });
              if (localimg) x.image = localimg.value;
            }
            x = {
              id: x.id,
              title: x?.title,
              description: x?.description,
              created_at: x?.created_at,
              image: x?.image,
              is_read: x.is_read,
              formatted_created_at: x?.created_at.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
            };
            return x;
          })
        ),
        isOff: isOff,
        is_membership_claimed: isMembershipClaimed ? true : false,
        user_balance_currency: `${currency.code}`,
        minimum_redeem_points: merchant?.minimum_redeem_points ?? 0,
        tag_ids: merchant.merchant_tag_ids,
        unique_code: formatMerchantCode(merchant.unique_code),
        distance: distance.toFixed(0),
        types: await Promise.all(
          merchantTypes.map(async (x) => {
            if (
              customer?.default_language.toString() !=
              defaultSystemLang._id.toString()
            ) {
              localName = await SystemLocalization.findOne({
                key: `${x.id}_merchantType_name`,
                lang_id: customer?.default_language,
              });
              if (localName) x.name = localName.value;
            }
            return x.name;
          })
        ),
        merchant_tags: await Promise.all(
          merchantTags.map(async (x) => {
            if (
              customer?.default_language.toString() !=
              defaultSystemLang._id.toString()
            ) {
              localName = await SystemLocalization.findOne({
                key: `${x.id}_merchantTag_name`,
                lang_id: customer?.default_language,
              });
              if (localName) x.name = localName.value;
            }
            return x.name;
          })
        ),
        merchant_latitude: merchantCoordinates[1],
        merchant_longitude: merchantCoordinates[0],
        cuisine_types: await Promise.all(
          cuisineTypes.map(async (x) => {
            if (
              customer?.default_language.toString() !=
              defaultSystemLang._id.toString()
            ) {
              localName = await SystemLocalization.findOne({
                key: `${x.id}_cuisineType_name`,
                lang_id: customer?.default_language,
              });
              if (localName) x.name = localName.value;
            }
            return x.name;
          })
        ),
        facilities: await Promise.all(
          facilities.map(async (x) => {
            if (
              customer?.default_language.toString() !=
              defaultSystemLang._id.toString()
            ) {
              localName = await SystemLocalization.findOne({
                key: `${x.id}_facility_name`,
                lang_id: customer?.default_language,
              });
              if (localName) x.name = localName.value;
            }
            return x.name;
          })
        ),
        address: localAddress?.value || merchant?.address,
        short_description:
          shortDescLocale?.value ?? merchant?.short_description,
        delivery_options: {
          available:
            localDeliveryOptionsAvailable.length > 0
              ? localDeliveryOptionsAvailable
              : deliveryOptionsAvailable,
          deliveryFee: `${merchant.delivery_options.deliveryFee} ${merchant.currency}`,
          deliveryTime: merchant.delivery_options.deliveryTime,
        },
        rating: sumResult.rating,
        rating_count: sumResult.total_count,
        pointRate: pointRate,
      };
      let CPL, PL;
      if (
        customer?.default_language.toString() !==
        defaultSystemLang._id.toString()
      ) {
        let localName;
        if (!lowClassification) {
          localName = await SystemLocalization.findOne({
            key: `basic_customerClassification_name`,
            lang_id: customer?.default_language,
          });
        } else {
          localName = await SystemLocalization.findOne({
            key: `${lowClassification?.id}_customerClassification_name`,
            lang_id: customer?.default_language,
          });
        }

        if (localName) {
          CPL = localName.value;
        } else {
          CPL = lowClassification?.name ?? "Basic";
        }

        const progressLocalName = await SystemLocalization.findOne({
          key: `${classification?.id}_customerClassification_name`,
          lang_id: customer?.default_language,
        });
        if (progressLocalName) {
          PL = progressLocalName.value;
        } else {
          PL = classification?.name ?? "Basic";
        }
      } else {
        CPL = lowClassification?.name ?? "Basic";
        PL = classification?.name ?? "Basic";
      }

      // Define initial data without `current_progress_level`
      const data = {
        merchantDetail,
        classification: {
          points_to_reach:
            classification?.points - transactions?.points > 0
              ? classification?.points - transactions?.points
              : 0,
          points_to_reach_formatted:
            classification?.points - transactions?.points > 0
              ? formatCount(classification?.points - transactions?.points)
              : 0,
          progress_points: transactions?.points ?? 0,
          progress_points_formatted: formatCount(transactions?.points ?? 0),
          progress_level: PL,
          progress_level_point: classification?.points ?? 0,
          progress_level_point_formatted: formatCount(
            classification?.points ?? 0
          ),
          progress_level_image: classification?.image,
          current_progress_level_image: lowClassification?.image,
          current_progress_level: CPL, // Placeholder for async value
        },
      };

      return response.send(
        1,
        STATUS_CODE.OK,
        "Merchant details",
        data,
        res,
        null
      );
    } catch (error) {
      // console.log(error);
      insertMessageLog(
        LOG_TYPE.ERROR,
        `Exception while fetching Merchant details: ${error?.message}`,
        {
          message: error?.message,
          stack: error?.stack,
          errorObject: error,
        },
        `/v1/merchant/get-detail/${req?.params?.merchantId}`,
        HTTP_VERBS.GET,
        req?.customer?.id || null
      );
      return response.send(
        0,
        STATUS_CODE.INTERNAL_SERVER_ERROR,
        "Couldn't fetch Merchant details",
        null,
        res,
        null
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
 *   description: APIs for merchant operations
 */

/**
 * @swagger
 * /v1/merchant/get-detail/{merchantId}:
 *   post:
 *     tags: [Merchant]
 *     summary: Get details of a specific merchant
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the merchant to get details
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     minimum: -90
 *                     maximum: 90
 *                   longitude:
 *                     type: number
 *                     minimum: -180
 *                     maximum: 180
 *     responses:
 *       '200':
 *         description: Merchant details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Merchant ID
 *                 listing_image:
 *                   type: string
 *                   description: Merchant image URL
 *                 name:
 *                   type: string
 *                   description: Merchant name
 *                 logo:
 *                   type: string
 *                   description: Merchant logo URL
 *                 cashback_percentage:
 *                   type: number
 *                   description: Cashback percentage offered by the merchant
 *                 user_balance_points:
 *                   type: integer
 *                   description: Customeromeromer's balance points with the merchant
 *                 type:
 *                   type: string
 *                   description: Type of the merchant
 *                   example: default
 *                 user_balance_currency:
 *                   type: string
 *                   description: currency of the merchant
 *                   example: default
 *                 user_balance_value:
 *                   type: string
 *                   description: points converted FIAT amount
 *                   example: default
 *                 tag_ids:
 *                   type: array
 *                   description: Array of tag IDs associated with the merchant
 *                   items:
 *                     type: string
 *                     example: example_tag_id
 *       '404':
 *         description: Merchant not found
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
 *                   example: Merchant not found
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
 *                   example: Could not process the request
 */
