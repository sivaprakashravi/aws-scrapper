const { host, login, dbHost, jQ } = require('./../constants/defaults');
const { removeSplChar } = require('./../utils/formatter');
const { prodDimensions, itemDimensions } = require('./../helpers/query-helper');
const { browser, page, html, browserIsOpen } = require('./../processors/browser-handler');
const { fetchAll } = require('./../processors/categories-handler');
const { jobStatusUpadate } = require('./../utils/handlers');
const _ = require('lodash');
const jsdom = require("jsdom");
const MongoClient = require('mongodb').MongoClient;
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
const axios = require('axios');
const os = require('os');
const networkInterfaces = os.networkInterfaces();
const { asyncDownload } = require('./images-handler');
global.document = document;
const $ = jQuery = require('jquery')(window);
const ip = require("ip");
const fs = require("fs");
const address = ip.address();
const isScEnabled = false;
const processProd = (asin, html, category, subCategory, subCategory1, subCategory2, subCategory3) => {
    $('body').html(html);
    let product = null;
    if (asin) {
        const initial_identifier = asin;
        const primaryImage = $('body img').attr('src');
        const images = $('body img').attr('srcset');
        const imageList = images ? images.split(', ') : [];
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
        let buybox_new_landed_price = $('.a-price[data-a-color="secondary"] .a-offscreen').text().substr(1);
        const list_price_currency_code = $('.a-price[data-a-color="base"] .a-offscreen').text()[0];
        let buybox_new_listing_price = $('.a-price[data-a-color="base"] .a-offscreen').text().substr(1);
        buybox_new_landed_price = buybox_new_landed_price ? buybox_new_landed_price : buybox_new_listing_price;
        const actualPerPercentage = (buybox_new_landed_price / 100);
        const offerPercentage = Math.ceil((buybox_new_landed_price - buybox_new_listing_price) / actualPerPercentage);
        const bankOffers = $('div[class="a-row a-size-base a-color-secondary"]').last().text();
        const deliveryDue = $('.a-row.a-size-base.a-color-secondary.s-align-children-center .a-text-bold').text();
        const deliveryBy = $('.a-row.a-size-base.a-color-secondary.s-align-children-center .a-row:last-child').text();
        const buybox_new_shipping_price = deliveryBy.split(' by ')[0];
        let salePrice = $('#priceblock_ourprice').text().substr(1);
        if (!salePrice) {
            salePrice = $('#price_inside_buybox').text().substr(1);
        }
        if (!salePrice) {
            salePrice = $('#twister-plus-price-data-price').val();
        }
        let shipping = $('#exports_desktop_qualifiedBuybox_tlc_feature_div span.a-size-base.a-color-secondary').text();
        if (!shipping) {
            shipping = $('#ourprice_shippingmessage span.a-size-base.a-color-secondary').text();
        }
        let shippingValues = shipping ? shipping.match(/\d+/g).map(Number) : 0;
        shippingPrice = shippingValues.toString().replace(',', '.');
        let listing_url = $('h2 a.a-link-normal').attr('href');
        const hrefsplit = listing_url ? listing_url.split('&url=') : null;
        if (hrefsplit && hrefsplit[1]) {
            listing_url = decodeURIComponent(hrefsplit[1]);
        }
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
            subCategory1,
            subCategory2,
            subCategory3,
            listing_url,
            salePrice,
            shippingPrice,
            localed: false
        };
    }
    return product;
};

const amazonScrapper = async function (url, category, subCategory, subCategory1, subCategory2, subCategory3, pageNo) {
    return await new Promise(async (resolve, reject) => {
        try {
            if (pageNo) {
                url = `${url}&page=${pageNo}`;
            }
            const prodHTML = (async () => {
                const isOpen = browserIsOpen();
                let pageLoaded = await page(url);
                if (!pageLoaded) {
                    await browser();
                    pageLoaded = await page(url);
                }
                if (!isOpen) {
                    console.log('Browser is newly Opened.');
                    console.log('Checking default country selected!!.');
                    const isCtrySelected = await pageLoaded.evaluate(() => {
                        const countrySelected = $('#glow-ingress-line2').text();
                        return countrySelected.indexOf('Glendale') > -1;
                    });
                    if (!isCtrySelected) {
                        console.log('US is not set as default. Falling back!');
                        console.log('Triggering Country Change Action.');
                        await pageLoaded.click('#nav-global-location-data-modal-action');
                        await pageLoaded.waitForSelector('#GLUXZipUpdateInput');
                        await pageLoaded.waitForTimeout(500);
                        await pageLoaded.$eval('input[id="GLUXZipUpdateInput"]', el => el.value = '91210');
                        // await pageLoaded.click('#GLUXCountryList');
                        await pageLoaded.waitForTimeout(500);
                        await pageLoaded.waitForSelector('#GLUXZipUpdate-announce');
                        await pageLoaded.click('#GLUXZipUpdate-announce');
                        // await pageLoaded.waitForSelector('#GLUXCountryList_107');
                        // await pageLoaded.click('#GLUXCountryList_107');
                        // await pageLoaded.waitForSelector('.a-popover-footer span.a-button.a-button-primary');
                        // await pageLoaded.click('.a-popover-footer span.a-button.a-button-primary');
                        pageLoaded.close();
                        pageLoaded = await page(url);
                    }
                }
                const pageScrapped = await pageLoaded.evaluate(() => {
                    let asinId = [];
                    let p = [];
                    $('body').html($('body').html().replace(/(\r\n|\n|\r)/gm, ''));
                    let html = $('body').html();
                    $('div[data-asin]').each(function () {
                        asinId.push($(this).attr('data-asin'));
                    });
                    const pageNo = $('.a-pagination li:nth-last-child(2)').text();
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
            const parsed = pdts.p.map(p => processProd(p.asin, p.html, category, subCategory, subCategory1, subCategory2, subCategory3));
            // console.log('Parsing done');
            resolve({ pageNo: pdts.pageNo, list: parsed });
        } catch (e) {
            console.log(e);
            reject(e);
        }
    }).then((d) => d).catch(e => e);
}

const browserInstance = async (product, onlyPrice) => {
    if (isScEnabled && !fs.existsSync("screenshots")) {
        fs.mkdirSync("screenshots");
    }
    if (product && product.listing_url && product.asin) {
        const url = `${host}${product.listing_url}`;
        const pageLoaded = await page(url);
        await pageLoaded.waitForSelector('#detailBullets_feature_div', { timeout: 10000 }).catch(async (e) => {
            // console.log(`failed to wait for Primary Details Selector #detailBullets_feature_div on ASIN - ${product.asin}`);
            // console.log(`Trying to Wait for alternate selector #productDetails_feature_div`);
            await pageLoaded.waitForSelector('#productDetails_feature_div', { timeout: 10000 }).catch((e) => {
                // console.log(`failed to wait for Secondary Details Selector #productDetails_feature_div on ASIN - ${product.asin}`);
                console.log(`WARNING - Corrupted Product Details! ${product.asin}`);
            });
        });
        await pageLoaded.waitForSelector('#price', { timeout: 10000 }).catch((e) => {
            // console.log(`failed to wait for the #price on ASIN - ${product.asin}`);
            console.log(`WARNING - Corrupted Price Details! ${product.asin}`);
        });
        if(isScEnabled) {
            await pageLoaded.screenshot({ path: `screenshots/${product.asin}.png`, fullpage: true });
        }
        const pageScrapped = await pageLoaded.evaluate(() => {
            const filename = (path) => {
                path = path.substring(path.lastIndexOf("/") + 1);
                return (path.match(/[^.]+(\.[^?#]+)?/) || [])[0];
            };
            const jSpot = (id, text) => {
                var jss = id.find(":contains(" + text + ")")
                    .filter(function () { return $(this).children().length === 0; });

                return jss;
            }
            $('body').html($('body').html().replace(/(\r\n|\n|\r)/gm, ''));
            const psProduct = {};
            const productDetails = $('#prodDetails');
            const altImages = $('#altImages li.imageThumbnail img');
            const imageList = [];
            if (altImages && altImages.length) {
                altImages.each((i, alt) => {
                    let name = filename($(alt).attr('src'));
                    name = name.split('.');
                    if (name && name.length) {
                        imageList.push(`${name[0]}.${name[name.length - 1]}`);
                    }
                });
            }
            psProduct.altImages = imageList;
            psProduct.brand = productDetails.find("tr:contains('Manufacturer') td:last-child").text();
            psProduct.description = $('#productDescription p').text();
            if (!psProduct.description) {
                psProduct.description = $('#feature-bullets ul li').not($(['class*="hidden"'])).text();
                psProduct.description = $.trim(psProduct.description);
            }
            psProduct.color = productDetails.find("tr:contains('Colour') td:last-child").text();
            psProduct.features = productDetails.find("tr:contains('Special features') td:last-child").text();
            psProduct.model = productDetails.find("tr:contains('Item model number') td:last-child").text();
            let salePrice = $('#priceblock_ourprice').text().substr(1);
            let shipping = $('#exports_desktop_qualifiedBuybox_tlc_feature_div span.a-size-base.a-color-secondary').text();
            if (!salePrice) {
                salePrice = $('#price_inside_buybox').text().substr(1);
            }
            if (!salePrice) {
                salePrice = $('#twister-plus-price-data-price').val();
            }
            if (!shipping) {
                shipping = $('#ourprice_shippingmessage span.a-size-base.a-color-secondary').text();
            }
            psProduct.salePrice = salePrice;
            const shippingValues = shipping ? shipping.match(/\d+/g).map(Number) : 0;
            psProduct.shippingPrice = shippingValues.toString().replace(',', '.');
            // psProduct.table = jSpot(productDetails.find("table"), 'Item Weight');
            let ounces = jSpot($('#prodDetails'), 'ounces').html();
            ounces = ounces ? ounces : jSpot($('#prodDetails'), 'Ounces').html();
            let pounds = jSpot($('#prodDetails'), 'pounds').html();
            pounds = pounds ? pounds : jSpot($('#prodDetails'), 'Pounds').html();
            if (!ounces) {
                ounces = jSpot($('#detailBulletsWrapper_feature_div'), 'Ounces').html();
            }
            if (!pounds) {
                pounds = jSpot($('#detailBulletsWrapper_feature_div'), 'Pounds').html();
            }
            if (ounces) {
                const split = ounces.split(';');
                if (split && split.length) {
                    if (split && split.length > 1) {
                        psProduct.item_dimensions_weight = split[1];
                    } else {
                        psProduct.item_dimensions_weight = split[0];
                    }
                }
            }
            if (pounds) {
                const split = pounds.split(';');
                if (split && split.length) {
                    if (split && split.length > 1) {
                        psProduct.item_dimensions_weight = split[1];
                    } else {
                        psProduct.item_dimensions_weight = split[0];
                    }
                }
            }
            psProduct.item_dimensions_weight = $.trim(psProduct.item_dimensions_weight);
            const availability = productDetails.find('#availability');
            psProduct.availableStock = null;
            if (availability && availability.text()) {
                const stock = availability.text().match(/\d+/g).map(Number);
                if (stock) {
                    psProduct.availableStock = availability.text();
                }
            }
            return psProduct;
        });
        pageLoaded.close();
        // const time = (new Date().getTime() - pageLoaded.timeOn) / 1000;
        // console.log(`${time} Seconds took - Browser Page Closed!`);
        const { altImages } = pageScrapped;
        if (altImages && altImages.length && !onlyPrice) {
            asyncDownload(altImages, product.asin);
        }
        return pageScrapped;
    }
}

const extractProdInformation = async (products, job) => {
    job.status = 'Running';
    jobStatusUpadate(job, 0);
    job.address = address;
    async function fetcherLoop() {
        const noOfProducts = products.length;
        for (let index = 0; index < noOfProducts; index++) {
            try {
                let insertResponse = await browserInstance(products[index]);
                const prod = _.merge(products[index], insertResponse);
                job.status = 'Running';
                const percentage = noOfProducts ? ((index + 1) / noOfProducts) * 100 : 0;
                const statusUpdated = await jobStatusUpadate(job, percentage);
                if (statusUpdated) {
                    prod.warning = {};
                    if (!prod.item_dimensions_weight) {
                        prod.warning.weight = 'Product weight is not available.\nPrice calculation maybe Affected.';
                    }
                    if (prod.label.length > 70) {
                        prod.warning.label = 'Product label is morethan 70 characters.';
                    }
                    await pushtoDB(prod, job);
                }
            } catch (err) {
                job.status = 'STOPPED';
                console.log(err);
                const percentage = noOfProducts ? ((index + 1) / noOfProducts) * 100 : 0;
                const stopped = await jobStatusUpadate(job, percentage);
                if (stopped) {
                    console.log(`Job ${job.scheduleId} stopped`);
                }
            }
        }
    }
    await fetcherLoop();
    return true;
}

const pushtoDB = async (data, job) => {
    data.jobId = job.scheduleId;
    return axios.post(`${dbHost}product/add`, data).then(async (res) => {
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

const getProducts = async () => {
    const products = await axios.get(`${dbHost}products/all`).then(async (res) => {
        return res.data.data;
    });
    if (products && products.length) {
        return products;
    }
}

const watchProducts = async ({ host }) => {
    const products = await getProducts();
    async function fetchProd() {
        const noOfProducts = products.length;
        const verify = ['salePrice', 'shippingPrice'];
        for (let index = 0; index < noOfProducts; index++) {
            const { asin } = products[index];
            const newDetails = await browserInstance(products[index], true);
            const amznProd = await axios.get(`${dbHost}product/${asin}`).then(async (res) => {
                return res.data.data;
            });
            if (newDetails.salePrice !== amznProd.salePrice || newDetails.shippingPrice !== amznProd.shippingPrice || newDetails.availableStock !== amznProd.availableStock) {
                const data = {
                    asin,
                    shippingPrice: newDetails.shippingPrice,
                    salePrice: newDetails.salePrice,
                    item_dimensions_weight: newDetails.item_dimensions_weight,
                    availableStock: newDetails.availableStock
                }
                axios.post(`${dbHost}notification/add`, data).then(async (res) => {
                    console.log(`ASIN: ${asin} - New Price / Stock Scrapped`);
                });
            }
        }
    }
    await fetchProd();

}

const amazonLogin = async function () {
    return true;
}

module.exports = { amazonScrapper, extractProdInformation, pushtoDB, getFromDB, amazonLogin, watchProducts };