const { Country, City, State } = require('@src/models');
const { City: Cities, Country: Countries, State: States } = require('country-state-city')

async function seedCurrenciesAndCities() {
    try {
        const countries = Countries.getAllCountries()
        for (const country of countries) {
            const updatedCountry = await Country.findOneAndUpdate({ name: country.name }, {
                code: country.isoCode,
                dial_code: `+${country.phonecode}`,
                latitude: country.latitude,
                longitude: country.longitude,
            }, { upsert: true })

            const states = States.getStatesOfCountry(country.isoCode)
            for (const state of states) {
                const updatedState = await State.findOneAndUpdate({ name: state.name }, {
                    code: state.isoCode,
                    country_id: updatedCountry._id,
                    country_code: state.countryCode,
                    latitude: state.latitude,
                    longitude: state.longitude,
                }, { upsert: true });

                const cities = Cities.getCitiesOfState(country.isoCode, state.isoCode)
                for (const city of cities) {
                    await City.findOneAndUpdate({ name: city.name }, {
                        country_code: city.countryCode,
                        state_code: city.stateCode,
                        latitude: city.latitude,
                        country_id: updatedCountry._id,
                        state_id: updatedState._id,
                        longitude: city.longitude,
                    }, { upsert: true });
                }
            }
        }
        console.log('Currencies ,states and cities seeded successfully');
    } catch (error) {
        console.error('Error seeding Currencies ,states and cities:', error);
        process.exit(1);
    }
}
module.exports = {
    seedCurrenciesAndCities
}