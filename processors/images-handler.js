
const https = require('https');
const Stream = require('stream').Transform;
const fs = require('fs-extra');
const { imgBaseLink, fileSaver } = require('./../constants/defaults');

const download = (url, asin) => {
    const link = `${imgBaseLink}${url}`;
    https.request(link, function (response) {
        var data = new Stream();

        response.on('data', function (chunk) {
            data.push(chunk);
        });

        response.on('end', function () {
            fs.outputFile(`${fileSaver}/${asin}/${url}`, data.read());
        });
    }).end();
}

const asyncDownload = (list, asin) => {
    const listPromises = [];
    if (list && list.length) {
        list.forEach(url => {
            listPromises.push(new Promise((resolve, reject) => {
                try {
                    resolve(download(url, asin));
                } catch (e) {
                    reject(e);
                }
            }));
        })
    }
    Promise.all(listPromises).then(d => d);
}

module.exports = { download, asyncDownload }