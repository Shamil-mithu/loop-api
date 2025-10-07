const {
    CUSTOMER_TYPES
} = require('@src/constants')

const CUSTOMER_TYPES_DATA = [
    { name: CUSTOMER_TYPES.BASIC, cashback_percent : 5 },
    { name: CUSTOMER_TYPES.SILVER, cashback_percent : 10 },
    { name: CUSTOMER_TYPES.GOLD, cashback_percent : 15 },
    { name: CUSTOMER_TYPES.DIAMONG, cashback_percent : 20 },
]
module.exports = {
    CUSTOMER_TYPES_DATA
}