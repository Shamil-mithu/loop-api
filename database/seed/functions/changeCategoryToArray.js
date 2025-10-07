"use strict";

const { Merchant } = require("../../../src/models");

async function changeCategoryToArray() {
    try {
        const merchants = await Merchant.find();
        
        for (const merchant of merchants) {
            console.log('merchant.categories',merchant.categories)
            console.log('merchant.categories',merchant.category_id)
            console.log('merchant.id',merchant.id)
            if (merchant.category_id && !merchant.categories.includes(merchant.category_id)) {
                await Merchant.updateOne({
                    _id : merchant.id 
                },{
                    $push: { categories: merchant.category_id }
                });
            }
        }

        console.log(`Updated ${merchants.length} merchants.`);
    } catch (error) {
        console.error("Error updating Merchant categories:", error);
        process.exit(1);
    }
}

module.exports = {
    changeCategoryToArray,
};
