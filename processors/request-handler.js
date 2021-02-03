var { host } = require('./../constants/defaults');
var _ = require('lodash');
const https = require('https');
var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);

var looper = async function (key, pageNo) {
    return await new Promise((resolve, reject) => {
        https.get(`${host}/s/query?k=${key}`, html => {
            html.setEncoding('utf8');
            let body = '';
            let page = '';
            let pageNo = 0;
            html.on('data', (chunk) => {
                body += chunk;
            });
            html.on('end', () => {
                let htmlString = '';
                let list = [];
                body = body.replace(/\n/g, '');
                body = body.replace(/(\r\n|\n|\r)/gm, '');
                body = body.split('&&&');
                page = _.filter(body, (l) => _.includes(l, 'MAIN-PAGINATION'));
                page = page ? JSON.parse(page) : null;
                if (page) {
                    const { html } = _.find(page, p => typeof p !== 'string');
                    $(html).appendTo('body');
                    pageNo = $('.a-disabled').text();
                }
                body = _.filter(body, (l) => _.includes(l, 'data-main-slot:search-result'));
                body = _.map(body, b => {
                    const parsedBody = JSON.parse(b);
                    let { html } = _.find(parsedBody, p => typeof p !== 'string');
                    html = html.replace(/(\r\n|\n|\r)/gm, '');
                    $('body').html(html);
                    const asin = $('body > div').attr('data-asin');
                    const uuid = $('body > div').attr('data-uuid');
                    const primaryImage = $('body img').attr('src');
                    const isSponsored = !!$('div .s-sponsored-label-text').text();
                    const productName = $('body h2').text();
                    const rating = $("span.a-icon-alt:contains('5')").text();
                    const actualPrice = $('.a-price-whole').text().replace(/[^\w\s]/gi, '');
                    const sellingPrice = $('.a-text-price > .a-offscreen').text().substr(1).replace(/[^\w\s]/gi, '');
                    const offerPercentage = (sellingPrice / 100) - (actualPrice / 100)
                    const product = {
                        asin,
                        uuid,
                        primaryImage,
                        "altImages": ["https://m.media-amazon.com/images/I/51lPB6P4BwL._AC_UL320_.jpg", "https://m.media-amazon.com/images/I/51lPB6P4BwL._AC_UL320_.jpg"],
                        isSponsored,
                        productName,
                        rating,
                        "noOfRating": 7,
                        actualPrice,
                        sellingPrice,
                        offerPercentage,
                        "bankOffers": ["1500 off on Kotak Bank Credit & Debit Card"],
                        "shippingCharges": 55,
                        "deliveryDueBy": "Saturday, February 6 - Sunday, February 7",
                        "category": "catName",
                        "subCategory": "subCatName"
                    };
                    list.push(product);
                });
                resolve({ htmlString, pageNo, list });
            });
        });
    }).then((d) => {
        return d;
    });
}

module.exports = { looper };