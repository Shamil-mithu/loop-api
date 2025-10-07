const { MERCHANT_TYPE } = require('@src/constants')

const MERCHANT =
    [
        {
            "name": "Mithu",
            "secret_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudF9pZCI6IjY2NGRjOWJjZmZlMGNhMTMyZmNhMjFiMSIsImlhdCI6MTcxNjM3NDIwNSwiZXhwIjoxNzE4OTY2MjA1fQ.i_9HjC4SJKJbuqv3Rc3cWFTMa-DnSS47q9G4U831cok",
            "description": "The One And Only",
            "delivery_time": 0,
            "currency": "SAR",
            "unique_code": "2234567898745325",
            "merchant_type_ids": [
                "66431f20032339d6ab603864",
                "66431f20032339d6ab603866"
            ],
            "minimum_redeem_points": 100,
            "cashback_percent": 5,
            "logo": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/mithu/81871aab-7694-473c-a9ed-5c744cb6e759.png",
            "cover_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/mithu/95814152-58d7-4be4-bc47-2168fa15cd5c.png",
            "listing_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/mithu/e5a66a88-6e49-45c0-bbfd-83635826fda4.png",
            "website_url": "https://mithu.app/",
            "merchant_tag_ids": [
                "664b536bffe0ca132fc88af6",
                "664b536bffe0ca132fc88aff",
                "664b536bffe0ca132fc88b09"
            ],
            "location": {
                "type": "Point",
                "coordinates": { "longitude": -73.973988, "latitude": 40.781324 },
                "name": "Karachi"
            },
            "contact_info": {
                "phone": "123-456-7890",
                "email": "hello@mithu.app",
                "website": "https://mithu.app/"
            },
            "delivery_options": {
                "available": true,
                "deliveryRadius": 10,
                "deliveryFee": 5,
                "deliveryTime": 30
            },
            "opening_hours": {
                "weekdays": "9:00 AM - 11:00 PM",
                "weekends": "10:00 AM - 12:00 AM"
            },
            "type": MERCHANT_TYPE.INTERNAL
        },
        {
            "name": "StarBucks",
            "secret_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudF9pZCI6IjY2NGRkNWY5ZmZlMGNhMTMyZmNhM2YwYSIsImlhdCI6MTcxNjQ0ODkxNCwiZXhwIjoxNzE5MDQwOTE0fQ.IHRMxnyspiE_q1rSWClLQRrIv7kXIB0WPh-sG9G0RaE",
            "description": "",
            "delivery_time": 45,
            "currency": "SAR",
            "unique_code": "2234567898745324",
            "merchant_type_ids": [
                "66431f20032339d6ab603864",
                "66431f20032339d6ab603866"
            ],
            "minimum_redeem_points": 100,
            "cashback_percent": 7,
            "logo": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/starbucks/41de5c53-4074-4ec6-9c6d-b12bbf3e3d8a.png",
            "cover_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/starbucks/7f058344-86f7-4887-bc0d-13851fa6f8d8.png",
            "listing_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/starbucks/1823e040-8c3e-4945-be1d-cd859c4a79f3.png",
            "website_url": "https://www.starbucks.com/",
            "merchant_tag_ids": [
                "664b536bffe0ca132fc88af6",
            ],
            "location": {
                "type": "Point",
                "coordinates": {
                    "longitude": 46.81862368667369,
                    "latitude": 25.067325258819192
                },
                "name": "Saudi Arabia"
            },
            "contact_info": {
                "phone": "+966 11 510 1575",
                "email": "info@starbucks.com",
                "website": "https://www.starbucks.com/"
            },

            "network_cashback_percentage": 15,
            "delivery_options": {
                "available": true,
                "deliveryRadius": 12,
                "deliveryFee": 20,
                "deliveryTime": 45
            },
            "opening_hours": {
                "weekdays": "9:00 AM - 11:00 PM",
                "weekends": "10:00 AM - 12:00 AM"
            },
            "type": MERCHANT_TYPE.DEFAULT
        },

        {
            "name": "McDonald's",
            "secret_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudF9pZCI6IjY2NGRkNWY5ZmZlMGNhMTMyZmNhM2YxOSIsImlhdCI6MTcxNjQ0ODk0NCwiZXhwIjoxNzE5MDQwOTQ0fQ.pctAW1XAEjSdCehCkhT2kqE6__hKOQTnMF4TW3ovTGk",
            "description": "",
            "delivery_time": 35,
            "currency": "SAR",
            "unique_code": "2234567898745323",
            "merchant_type_ids": [
                "66433e02ffe0ca132fc53028",
                "66433e02ffe0ca132fc5302a"
            ],
            "minimum_redeem_points": 100,
            "cashback_percent": 8,
            "logo": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/mcdonald-s/fe50dfca-a4da-44ff-bdd9-e8ebd106b69f.png",
            "cover_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/mcdonald-s/b3510d9c-196c-490a-871f-105c01b74ac0.png",
            "listing_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/mcdonald-s/e980faf7-b0e3-4816-94d1-a3ce8a30383c.png",
            "website_url": "https://www.mcdonalds.com/sa/en-sa/riyadh.html",
            "merchant_tag_ids": [
                "664b536bffe0ca132fc88af6",
                "664b536bffe0ca132fc88aff",
                "664b536bffe0ca132fc88b09"
            ],
            "location": {
                "type": "Point",
                "coordinates": {
                    "longitude": 45.75388078351887,
                    "latitude": 28.501761860963967
                },
                "name": "Saudi Arabia"
            },
            "contact_info": {
                "phone": "+966 800 121 2345",
                "email": "info@mcdonalds.com",
                "website": "https://www.mcdonalds.com/sa/en-sa/riyadh.html"
            },

            "network_cashback_percentage": 2.5,
            "delivery_options": {
                "available": true,
                "deliveryRadius": 14,
                "deliveryFee": 25,
                "deliveryTime": 35
            },
            "opening_hours": {
                "weekdays": "9:00 AM - 11:00 PM",
                "weekends": "10:00 AM - 12:00 AM"
            },
            "type": MERCHANT_TYPE.DEFAULT
        },

        {
            "name": "KFC",
            "secret_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudF9pZCI6IjY2NGRjOWJjZmZlMGNhMTMyZmNhMjFiNyIsImlhdCI6MTcxNjM3NDQwNCwiZXhwIjoxNzE4OTY2NDA0fQ.5s-byTa4KGu8y6S9cI4B74lT7xpAw8EjhpTPtVfgOP8",
            "description": "",
            "delivery_time": 32,
            "currency": "SAR",
            "unique_code": "2234567898745322",
            "merchant_type_ids": [
                "664b536bffe0ca132fc88af6",
            ],
            "minimum_redeem_points": 100,
            "cashback_percent": 7,
            "logo": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/kfc/9d109e2c-baf3-4351-a58d-a1d6d678738c.png",
            "cover_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/kfc/9e48c6a7-0ee2-4ead-8d54-16bd4375f39a.png",
            "listing_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/kfc/a13d28ea-4616-460f-a8d7-6699ac0a5e5c.png",
            "website_url": "https://saudi.kfc.me/en/home",
            "merchant_tag_ids": [
                "66431f20032339d6ab60386e",
                "66431f20032339d6ab603870"
            ],
            "location": {
                "type": "Point",
                "coordinates": {
                    "longitude": 46.68489859115666,
                    "latitude": 24.69271937650409
                },
                "name": "Saudi Arabia"
            },
            "contact_info": {
                "phone": "+966 123 123 1234",
                "email": "info@kfc.com",
                "website": "https://saudi.kfc.me/en/home"
            },

            "network_cashback_percentage": 5,
            "delivery_options": {
                "available": true,
                "deliveryRadius": 10,
                "deliveryFee": 28,
                "deliveryTime": 32
            },
            "opening_hours": {
                "weekdays": "9:00 AM - 11:00 PM",
                "weekends": "10:00 AM - 12:00 AM"
            },
            "type": MERCHANT_TYPE.DEFAULT
        },

        {
            "name": "Burger King",
            "secret_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudF9pZCI6IjY2NGRjOWJjZmZlMGNhMTMyZmNhMjFiOSIsImlhdCI6MTcxNjM3NDQyOCwiZXhwIjoxNzE4OTY2NDI4fQ.bERGpWrtBaPOwbXLEjPCwrZA9yf3iXuNfovi9WP0doA",
            "description": "",
            "delivery_time": 36,
            "currency": "SAR",
            "unique_code": "2234567898745329",
            "merchant_type_ids": [
                "66431f20032339d6ab603864",
                "66431f20032339d6ab603866"
            ],
            "minimum_redeem_points": 100,
            "cashback_percent": 3,
            "logo": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/burger-king/7a368479-6ac3-470f-a539-3a253d5caea4.png",
            "cover_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/burger-king/bd096704-d8e4-420d-8c0c-23e234a78d53.png",
            "listing_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/burger-king/8fddf932-67b1-40eb-ad1b-c79118437e92.png",
            "website_url": "https://www.burgerking.com.sa/",
            "merchant_tag_ids": [
                "664b536bffe0ca132fc88b09"
            ],
            "location": {
                "type": "Point",
                "coordinates": {
                    "longitude": 50.115156289069574,
                    "latitude": 26.40096767527284
                },
                "name": "Saudi Arabia"
            },
            "contact_info": {
                "phone": "+966 123 123 1234",
                "email": "info@burgerking.com",
                "website": "https://www.burgerking.com.sa/"
            },

            "network_cashback_percentage": 5,
            "delivery_options": {
                "available": true,
                "deliveryRadius": 7,
                "deliveryFee": 40,
                "deliveryTime": 36
            },
            "opening_hours": {
                "weekdays": "9:00 AM - 11:00 PM",
                "weekends": "10:00 AM - 12:00 AM"
            },
            "type": MERCHANT_TYPE.DEFAULT
        },

        {
            "name": "Baskin Robbin's",
            "secret_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudF9pZCI6IjY2NGRjOWJjZmZlMGNhMTMyZmNhMjFiYiIsImlhdCI6MTcxNjM3NDQ2MywiZXhwIjoxNzE4OTY2NDYzfQ.PbRulklo-cozm0fl8lgM1lfeuCY1usSQ7NxFLFC6YSI",
            "description": "",
            "delivery_time": 28,
            "currency": "SAR",
            "unique_code": "2234567898745320",
            "merchant_type_ids": [
                "66431f20032339d6ab603864",
                "66431f20032339d6ab603866"
            ],
            "minimum_redeem_points": 100,
            "cashback_percent": 9,
            "logo": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/baskin-robbin-s/43cae72f-deba-4b3b-adc6-aaa3b8d0f346.png",
            "cover_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/baskin-robbin-s/34f818ed-0854-456e-ba44-3e8250c85e96.png",
            "listing_image": "https://dev-mithu.s3.me-central-1.amazonaws.com/merchant/baskin-robbin-s/c5aefeab-9fdd-4186-aa5f-8a480c150f7d.png",
            "website_url": "https://www.baskinrobbinsmea.com/en/delivery-service/sa/",
            "merchant_tag_ids": [
                "664b536bffe0ca132fc88af6",
            ],
            "location": {
                "type": "Point",
                "coordinates": {
                    "longitude": 46.70171491194454,
                    "latitude": 24.697062249403196
                },
                "name": "Saudi Arabia"
            },
            "contact_info": {
                "phone": "+966 13 834 3410",
                "email": "info@baskinrobbns.com",
                "website": "https://www.baskinrobbinsmea.com/en/delivery-service/sa/"
            },

            "network_cashback_percentage": 2.5,
            "delivery_options": {
                "available": true,
                "deliveryRadius": 9,
                "deliveryFee": 26,
                "deliveryTime": 28
            },
            "opening_hours": {
                "weekdays": "9:00 AM - 11:00 PM",
                "weekends": "10:00 AM - 12:00 AM"
            },
            "type": MERCHANT_TYPE.DEFAULT
        }
    ]

module.exports = {
    MERCHANT
};
