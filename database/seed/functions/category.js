const { Category } = require('../../../src/models');
const { CATEGORY_DATA } = require('../data/catergory');

async function seedCategory() {
    try {

        for (const category of CATEGORY_DATA) {
            await Category.findOneAndUpdate({ name: category.name }, category, { upsert: true });
        }
        console.log('category seeded successfully');
    } catch (error) {
        console.error('Error seeding category:', error);
        process.exit(1);
    }
}
module.exports = {
    seedCategory
}