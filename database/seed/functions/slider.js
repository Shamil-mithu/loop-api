const { Slider } = require('@src/models');
const { SLIDER_DATA } = require('../data/slider');

async function seedSliderData() {
    try {

        for (const seed of SLIDER_DATA) {
            await Slider.findOneAndUpdate({ title: seed.title }, seed, { upsert: true });
        }
        console.log('Slider data seeded successfully');
    } catch (error) {
        console.error('Error seeding Slider data:', error);
        process.exit(1);
    }
}
module.exports = {
    seedSliderData
}