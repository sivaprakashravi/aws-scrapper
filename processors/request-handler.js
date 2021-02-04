const { host } = require('./../constants/defaults');
const { removeSplChar } = require('./../utils/formatter');
const _ = require('lodash');
const https = require('https');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

const $ = jQuery = require('jquery')(window);
const processProd = (html, key) => {
    $('body').html(html);
    const asin = $('body > div').attr('data-asin');
    let product = null;
    if (asin) {
        const uuid = $('body > div').attr('data-uuid');
        const primaryImage = $('body img').attr('src');
        const images = $('body img').attr('srcset');
        const imageList = images.split(', ');
        const altImages = {};
        _.map(imageList, i => {
            const image = i.split(' ');
            altImages[image[1]] = image[0];
        });
        const isSponsored = !!$('div .s-sponsored-label-text').text();
        let productName = $('body h5').text();
        let prodMinDesc =  $('body h2').text();
        productName = productName ? productName : prodMinDesc;
        prodMinDesc = (productName === prodMinDesc) ? '' : prodMinDesc;
        const rating = $("span.a-icon-alt:contains('5')").text();
        const noOfRating = removeSplChar($(".a-link-normal .a-size-base").text(), true);
        const actualPrice = removeSplChar($('.a-text-price > .a-offscreen').text().substr(1), true);
        const sellingPrice = removeSplChar($('.a-price-whole').text(), true);
        const actualPerPercentage = (actualPrice / 100);
        const offerPercentage = Math.ceil((actualPrice - sellingPrice) / actualPerPercentage);
        const bankOffers = $('div[class="a-row a-size-base a-color-secondary"]').last().text();
        const deliveryDue = $('.a-row.a-size-base.a-color-secondary.s-align-children-center .a-text-bold').text();
        const deliveryBy = $('.a-row.a-size-base.a-color-secondary.s-align-children-center .a-row:last-child').text();
        const shippingCharges = deliveryBy.split(' by ')[0];
        const category = key;
        const subCategory = null;
        product = {
            asin,
            uuid,
            primaryImage,
            altImages,
            isSponsored,
            productName,
            prodMinDesc,
            rating,
            noOfRating,
            actualPrice,
            sellingPrice,
            offerPercentage,
            bankOffers,
            shippingCharges,
            deliveryDue,
            category,
            subCategory
        };
    }
    return product;
}
const amazonScrapper = async function (key, pageNo) {
    return await new Promise((resolve, reject) => {
        let url = `${host}/s/query?`;
        if (key) {
            url = `${url}k=${key}`;
        }
        if (pageNo) {
            url = `${url}&page=${pageNo}`;
        }
        console.log(url);
        https.get(url, html => {
            html.setEncoding('utf8');
            let body = '';
            let page = '';
            html.on('data', (chunk) => {
                body += chunk;
            });
            html.on('end', () => {
                let list = [];
                body = body.replace(/\n/g, '');
                body = body.replace(/(\r\n|\n|\r)/gm, '');
                body = body.split('&&&');
                if (!pageNo) {
                    page = _.filter(body, (l) => _.includes(l, 'MAIN-PAGINATION'));
                    page = page ? JSON.parse(page) : null;
                    if (page) {
                        const { html } = _.find(page, p => typeof p !== 'string');
                        $(html).appendTo('body');
                        pageNo = $('.a-pagination .a-disabled').last().text();
                        pageNo = Number(pageNo);
                    }
                }
                body = _.filter(body, (l) => _.includes(l, 'data-main-slot:search-result'));
                body = _.map(body, b => {
                    const parsedBody = JSON.parse(b);
                    let { html } = _.find(parsedBody, p => typeof p !== 'string');
                    html = html.replace(/(\r\n|\n|\r)/gm, '');
                    const product = processProd(html, key);
                    if(product) {
                        list.push(product);
                    }
                });
                resolve({ pageNo, list });
            });
        });
    }).then((d) => {
        return d;
    });
}

module.exports = { amazonScrapper };