const { host, login, dbHost, jQ } = require('./../constants/defaults');
const { removeSplChar } = require('./../utils/formatter');
const { prodDimensions, itemDimensions } = require('./../helpers/query-helper');
const { browser, page, html } = require('./../processors/browser-handler');
const { fetchAll } = require('./../processors/categories-handler');
const _ = require('lodash');
const jsdom = require("jsdom");
const MongoClient = require('mongodb').MongoClient;
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
const axios = require('axios');
global.document = document;
const $ = jQuery = require('jquery')(window);
const processProd = (asin, html, category, subCategory) => {
    $('body').html(html);
    let product = null;
    if (asin) {
        const initial_identifier = asin;
        const primaryImage = $('body img').attr('src');
        const images = $('body img').attr('srcset');
        const imageList = images.split(', ');
        const altImages = {};
        _.map(imageList, i => {
            const image = i.split(' ');
            altImages[removeSplChar(image[1])] = image[0];
        });
        const isSponsored = !!$('div .s-sponsored-label-text').text();
        let label = $('body h5').text();
        let prodMinDesc = $('body h2').text();
        label = label ? label : prodMinDesc;
        prodMinDesc = (label === prodMinDesc) ? '' : prodMinDesc;
        const rating = $("span.a-icon-alt:contains('5')").text();
        const noOfRating = removeSplChar($(".a-link-normal .a-size-base").text(), true);
        let buybox_new_landed_price = removeSplChar($('.a-text-price > .a-offscreen').text().substr(1), true);
        const list_price_currency_code = $('.a-text-price > .a-offscreen').text()[0];
        const buybox_new_listing_price = removeSplChar($('.a-price-whole').text(), true);
        buybox_new_landed_price = buybox_new_landed_price ? buybox_new_landed_price : buybox_new_listing_price;
        const actualPerPercentage = (buybox_new_landed_price / 100);
        const offerPercentage = Math.ceil((buybox_new_landed_price - buybox_new_listing_price) / actualPerPercentage);
        const bankOffers = $('div[class="a-row a-size-base a-color-secondary"]').last().text();
        const deliveryDue = $('.a-row.a-size-base.a-color-secondary.s-align-children-center .a-text-bold').text();
        const deliveryBy = $('.a-row.a-size-base.a-color-secondary.s-align-children-center .a-row:last-child').text();
        const buybox_new_shipping_price = deliveryBy.split(' by ')[0];
        let listing_url = $('h2 a.a-link-normal').attr('href');
        const hrefsplit = listing_url ? listing_url.split('&url=') : null;
        if (hrefsplit && hrefsplit[1]) {
            listing_url = decodeURIComponent(hrefsplit[1]);
        }
        if (buybox_new_landed_price && buybox_new_listing_price) {
            product = {
                asin,
                initial_identifier,
                primaryImage,
                altImages,
                isSponsored,
                label,
                prodMinDesc,
                rating,
                noOfRating,
                buybox_new_landed_price,
                buybox_new_listing_price,
                buybox_new_shipping_price,
                list_price_currency_code,
                offerPercentage,
                bankOffers,
                deliveryDue,
                category,
                subCategory,
                listing_url
            };
        }
    }
    return product;
};

const amazonScrapper = async function (url, category, subCategory, pageNo) {
    return await new Promise(async (resolve, reject) => {
        try {
            if (pageNo) {
                url = `${url}&page=${pageNo}`;
            }
            const prodHTML = (async () => {
                let pageLoaded = await page(url);
                if (!pageLoaded) {
                    await browser();
                    pageLoaded = await page(url);
                }
                const pageScrapped = await pageLoaded.evaluate(() => {
                    let asinId = [];
                    let p = [];
                    $('body').html($('body').html().replace(/(\r\n|\n|\r)/gm, ''));
                    let html = $('body').html();
                    $('div[data-asin]').each(function () {
                        asinId.push($(this).attr('data-asin'));
                    });
                    const pageNo = $('.a-pagination .a-disabled').last().text();
                    asinId = asinId.filter(a => a);
                    $(asinId).each(function (i, asin) {
                        p.push({ asin, html: $(`div[data-asin="${asin}"]`).html() });
                    });
                    return { asinId, p, pageNo, html };
                });
                await pageLoaded.close();
                const time = (new Date().getTime() - pageLoaded.timeOn) / 1000;
                // console.log(`${time} Seconds took - Browser Page Closed!`);
                return pageScrapped;
            });
            const pdts = await prodHTML();
            const parsed = pdts.p.map(p => processProd(p.asin, p.html, category, subCategory));
            // console.log('Parsing done');
            resolve({ pageNo: pdts.pageNo, list: parsed });
        } catch (e) {
            reject(e);
        }
    }).then((d) => d).catch(error => console.log(error));
}

const browserInstance = async (product) => {
    if (product && product.listing_url) {
        const url = `${host}${product.listing_url}`;
        const pageLoaded = await page(url);
        const pageScrapped = await pageLoaded.evaluate(() => {
            $('body').html($('body').html().replace(/(\r\n|\n|\r)/gm, ''));
            const psProduct = {};
            const productDetails = $('#prodDetails');
            psProduct.brand = productDetails.find("tr:contains('Manufacturer') td:last-child").text();
            psProduct.description = $('#productDescription p').text();
            psProduct.color = productDetails.find("tr:contains('Colour') td:last-child").text();
            psProduct.features = productDetails.find("tr:contains('Special features') td:last-child").text();
            psProduct.model = productDetails.find("tr:contains('Item model number') td:last-child").text();

            psProduct.item_dimensions_weight = productDetails.find("tr:contains('Item Weight') td:last-child").text();
            return psProduct;
        });
        pageLoaded.close();
        // const time = (new Date().getTime() - pageLoaded.timeOn) / 1000;
        // console.log(`${time} Seconds took - Browser Page Closed!`);
        return pageScrapped;
    }
}

const extractProdInformation = async (products, job) => {
    async function fetcherLoop() {
        const noOfProducts = products.length;
        jobStatusUpadate(job, 0);
        for (let index = 0; index < noOfProducts; index++) {
            try {
                let insertResponse = await browserInstance(products[index]);
                const prod = _.merge(products[index], insertResponse);
                job.status = 'Running';
                const statusUpdated = await jobStatusUpadate(job, ((index + 1) / noOfProducts) * 100);
                if (statusUpdated) {
                    pushtoDB(prod, job);
                }
            } catch(err) {
                job.status = 'STOPPED';
                const stopped = await jobStatusUpadate(job, ((index) / noOfProducts) * 100);
                if(stopped) {
                    console.log(`Job ${job.scheduleId} stopped`);
                }
            }
        }
    }
    await fetcherLoop();
    return true;
}

const pushtoDB = async (data, job) => {
    return axios.post(`${dbHost}product/add`, data).then(async (res) => {
        return res.data.data;
    });
};

const jobStatusUpadate = async ({ _id, scheduleId, status }, percentage) => {
    return axios.get(`${dbHost}job/status/${_id}/${scheduleId}?percentage=${percentage}&status=${status}`).then(async (res) => {
        return res.data.data;
    });
};

const getFromDB = async () => {
    return new Promise((resolve, reject) => {
        MongoClient.connect(dbHost, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }, (err, db) => {
            if (err) reject(err);
            var dbo = db.db("tokopedia-amazon");
            dbo.collection("tokopedia-products").find().sort({ _id: 1 }).limit(100).toArray().then(d => {
                resolve(d);
            });
        });
    }).then(d => d).catch(e => {
        console.log('Pushed to DB');
    });
}

const amazonLogin = async function () {
    return true;
}

module.exports = { amazonScrapper, extractProdInformation, pushtoDB, getFromDB, amazonLogin };