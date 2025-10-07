"use strict"

const { cloudinary } = require('../config')

async function uploadImages(files, folder) {
    const uploadPromises = [];

    for (const file of files) {
        const uploadPromise = new Promise((resolve, reject) => {
            const options = { folder: folder };
            cloudinary.uploader.upload(file.tempFilePath, options, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
        uploadPromises.push(uploadPromise);
    }
    return Promise.all(uploadPromises);
}

module.exports = uploadImages