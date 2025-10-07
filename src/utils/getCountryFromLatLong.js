const NodeGeocoder = require('node-geocoder');


async function getCountryFromLatLong(latitude, longitude) {
    const geocoder = NodeGeocoder({
        provider: 'openstreetmap',
        language: 'en'
    });

    const res = await geocoder.reverse({ lat: latitude, lon: longitude });
    return res[0]?.countryCode || null;
}

module.exports = getCountryFromLatLong
