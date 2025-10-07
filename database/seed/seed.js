"use strict"
require('module-alias/register')
const { seedCurrencies } = require('./functions/currency');
const { seedCurrenciesAndCities } = require('./functions/country_codes');
const { seedTransactionSource } = require('./functions/transaction_sources')
const { seedCustomerTypes } = require('./functions/customer_types')
const { seedMerchantTypes } = require('./functions/merchant_types')
const { seedMerchantTags } = require('./functions/merchant_tags')
const { seedMerchant } = require('./functions/merchant')
const { seedCustomerTransaction } = require('./functions/customer_transaction')
const { seedCustomerBalances } = require('./functions/customer_balances')
const { seedCategory } = require('./functions/category')
const { seedFAQs } = require('./functions/faq')
const { seedSliderData } = require('./functions/slider')
const { seedMerchantCategories } = require('./functions/merchant_categories')
const { seedMerchantProducts } = require('./functions/merchant_products')
const { seedLanguages } = require('./functions/language')
const { seedLocalization } = require('./functions/localization')
const { seedResponsesLocalization } = require('./functions/responseLocalization')
const { changeCategoryToArray } = require('./functions/changeCategoryToArray')
require('@root/database')

const args = process.argv.slice(2);

const validEnvironments = ['development', 'testing', 'staging'];

const environmentFlag = args.find(arg => validEnvironments.includes(arg));

const runSeedFunctions = async () => {
    if (!environmentFlag) {
        console.log('Invalid command. Please specify a valid environment flag (--development, --testing, --staging).');
    } else {
        switch (environmentFlag) {
            case 'development':
                // await seedCurrencies();
                // await seedCurrenciesAndCities();
                // await seedTransactionSource();
                // await seedCustomerTypes();
                // await seedMerchantTypes();
                // await seedMerchantTags();
                // await seedMerchant();
                // await seedCustomerTransaction();
                // await seedCustomerBalances();
                // await seedCategory();
                // await seedFAQs();
                // await seedSliderData();
                // await seedMerchantCategories();
                // await seedMerchantProducts();
                // await seedLanguages();
                // await seedLocalization();
                // await seedResponsesLocalization()
                await changeCategoryToArray()

                break;
            case 'testing':
                // Call testing seed functions
                break;
            case 'staging':
                // Call staging seed functions
                break;
            default:
                console.log('Invalid environment.');
                break;
        }
        process.exit('1')
    }
};
runSeedFunctions();
