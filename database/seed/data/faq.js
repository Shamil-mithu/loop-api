const { FAQ_STATUS } = require('@src/constants')

const FAQs = [
    {
        title: "What is your return policy?",
        description: "You can return any item within 30 days of purchase if it's in its original condition.",
        status: FAQ_STATUS.ACTIVE,
        display_order: 1
    },
    {
        title: "How do I track my order?",
        description: "Once your order has shipped, you will receive an email with a tracking number and link.",
        status: FAQ_STATUS.ACTIVE,
        display_order: 2
    },
    {
        title: "Do you ship internationally?",
        description: "Yes, we ship to most countries worldwide. Shipping fees and times may vary.",
        status: FAQ_STATUS.ACTIVE,
        display_order: 3
    },
    {
        title: "Can I change or cancel my order?",
        description: "You can change or cancel your order within 24 hours of placing it by contacting our support team.",
        status: FAQ_STATUS.ACTIVE,
        display_order: 4
    },
    {
        title: "What payment methods do you accept?",
        description: "We accept all major credit cards, PayPal, and bank transfers.",
        status: FAQ_STATUS.ACTIVE,
        display_order: 5
    }
];

module.exports = {
    FAQs
};
