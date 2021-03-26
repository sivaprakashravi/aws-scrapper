const { host, dbHost } = require('./../constants/defaults');
const { browser, page, html } = require('./../processors/browser-handler');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const $ = jQuery = require('jquery')(window);
const _ = require('lodash');
const axios = require('axios');
const moment = require('moment');

const fetchMainCategory = (async () => {
    const url = host;
    const pageLoaded = await page(url);
    let primaryCategories = await pageLoaded.evaluate(() => {
        if ($('#searchDropdownBox').html()) {
            const options = $('#searchDropdownBox option');
            const list = [];
            $(options).each((i, option) => {
                if (i) {
                    list.push({
                        name: $(option).text(),
                        value: $(option).val(),
                        treeIndex: 0,
                        createdDate: new Date().getTime(),
                        createdBy: 'DEVELOPER'
                    });
                }
            });
            return list;
        }
    });
    await pageLoaded.close();
    primaryCategories.forEach(p => p.createdDate = moment().format())
    return primaryCategories;
});

categoryInstance = (async (category) => {
    if (category && category.value) {
        const url = `${host}/s/ref=nb_sb_noss?url=${category.value}`;
        // https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Darts-crafts-intl-ship
        const pageLoaded = await page(url);
        const pageScrapped = await pageLoaded.evaluate(() => {
            const queryParams = (url, query) => {
                const match = RegExp('[?&]' + query + '=([^&]*)').exec(url);
                return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
            };
            const refinements = $("#s-refinements div.a-section.a-spacing-none:contains('Department')").find('ul li a');
            const levelOne = [];
            const mainCategories = [];
            let catId;
            $(refinements).each((i, refinement) => {
                catId = null;
                const href = $(refinement).attr('href');
                const name = $(refinement).find('span').text();
                let rh = queryParams(href, 'rh');
                let rnid = queryParams(href, 'rnid');
                let nIds = rh ? rh.split(',') : [];
                nIds = nIds.map(n => n.split(":").pop());
                catId = rnid;
                levelOne.push({
                    name,
                    nId: nIds[1] ? nIds[1] : nIds[0],
                    treeIndex: 1
                });
            });
            return { catId, levelOne, mainCategories };
        });
        pageLoaded.close();
        // const time = (new Date().getTime() - pageLoaded.timeOn) / 1000;
        // console.log(`${time} Seconds took - Browser Page Closed!`);
        pageScrapped.mainCategories && pageScrapped.mainCategories.length ? pageScrapped.mainCategories.forEach(mc => mc.parentIndex = category.name) : null;
        return pageScrapped;
    }
});

categoryLevelInstance = (async (sCategory, nId) => {
    if (sCategory && sCategory.nId) {
        const url = `${host}/s?bbn=${nId}&rh=n:${nId},n:${sCategory.nId}`;
        // https://www.amazon.com/s?i=automotive-intl-ship&bbn=2562090011&rh=n:2562090011,n:15718271,n:15718291,n:15718301,n:19351186011&dc&qid=1614313546&rnid=15718301&ref=sr_nr_n_1
        let pageLoaded = await page(url);
        // console.log(url);
        if(!pageLoaded) {
            await browser();
            pageLoaded = await page(url);
        }
        const pageScrapped = await pageLoaded.evaluate(() => {
            const queryParams = (url, query) => {
                const match = RegExp('[?&]' + query + '=([^&]*)').exec(url);
                return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
            };
            const deptElementElement = $("#s-refinements div.a-section.a-spacing-none:contains('Department')");
            let refinements = deptElementElement.find('ul li.s-navigation-indent-2 a');
            if (!refinements) {
                refinements = deptElementElement.find('ul li.s-navigation-indent-1 a')
            }
            const levelTwo = [];
            // return refinements;
            $(refinements).each((i, refinement) => {
                const href = $(refinement).attr('href');
                const name = $(refinement).find('span').text();
                // const urlParams = new URLSearchParams(href);
                let rh = queryParams(href, 'rh');
                let node = queryParams(href, 'node');
                if (rh) {
                    let nIds = rh.split(',');
                    nIds = nIds.map(n => n.split(":").pop());
                    levelTwo.push({
                        name,
                        nId: nIds[2] ? nIds[2] : nIds[1],
                        treeIndex: 2
                    });
                } else if (node) {
                    levelTwo.push({
                        name,
                        node,
                        treeIndex: 2,
                        endOfTree: true
                    });
                }
            });
            return levelTwo;
        });
        pageLoaded.close();
        return pageScrapped;
    }

});

categoriesLevelOne = (async (categoriesList) => {
    let additionalCategories = [];
    async function fetcherLoop() {
        const noOfProducts = categoriesList.length;
        for (let index = 0; index < noOfProducts; index++) {
            const category = categoriesList[index];
            let { catId, levelOne, mainCategories } = await categoryInstance(category);
            category.nId = catId;
            if (levelOne && levelOne.length) {
                category.subCategory = levelOne;
            }
            if (mainCategories && mainCategories.length) {
                category.remove = true;
                additionalCategories = _.concat(additionalCategories, mainCategories);
            }            
            console.log(`${index+1} L1 Instance Fetched`);
        }
    }
    await fetcherLoop();
    if (additionalCategories && additionalCategories.length) {
        categoriesList = _.concat(categoriesList, additionalCategories);
    }
    categoriesList = categoriesList.filter(c => (!c.remove && c.nId));
    return categoriesList;
});

categoriesLevelTwo = (async (categoriesList) => {
    async function fetcherLoop() {
        const noOfProducts = categoriesList.length;
        for (let index = 0; index < noOfProducts; index++) {
            const { subCategory, nId } = categoriesList[index];
            async function fetcherLoopDInstance() {
                if (subCategory && subCategory.length) {
                    const noOfProducts2 = subCategory.length;
                    for (let index2 = 0; index2 < noOfProducts2; index2++) {
                        const sCategory = subCategory[index2];
                        const params1 = `bbn=${nId}&rh=n:${nId},n:${sCategory.nId}`;
                        let levelTwo = await categoryLevelInstance(params1);
                        console.log(`${index + 1} - ${index2 + 1} L2 Instance Fetched`);
                        if (levelTwo && levelTwo.length) {
                            sCategory.subCategory = levelTwo;
                            // l3
                            for (let index3 = 0; index3 < levelTwo.length; index3++) {
                                const l3 = levelTwo[index3];
                                async function fetcherLoopDInstance2() {
                                    if (l3.subCategory && l3.subCategory.length) {
                                        const levelTwo2 = l3.subCategory.length;
                                        for (let index4 = 0; index4 < levelTwo2; index4++) {
                                            const sCategory2 = l3.subCategory[index4];
                                            const params2 = `bbn=${nId}&rh=n:${nId},n:${sCategory.nId},n:${sCategory2.nId}`;
                                            let levelTwo = await categoryLevelInstance(params2);
                                            console.log(`${index + 1} - ${index2 + 1} - ${index3 + 1} - ${index4 + 1} L3 Instance Fetched`);
                                            if (levelTwo && levelTwo.length) {
                                                sCategory2.subCategory = levelTwo;
                                            }
                                        }
                                    }
                                }
                                await fetcherLoopDInstance2();
                            }
                        }
                    }
                }
            }
            await fetcherLoopDInstance();
        }
    }
    await fetcherLoop();
    return categoriesList;
});
const testCategories = false;
const categories = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!testCategories) {
                let mainCategories = await fetchMainCategory();
                // resolve(mainCategories);
                if (mainCategories && mainCategories.length) {
                    const splitted = await categoriesLevelOne(mainCategories);
                    // const l2 = await categoriesLevelTwo(splitted);
                    resolve(splitted);
                }
            } else {
                const mainCategories = await axios.get(`${dbHost}category/all`).then(async (res) => {
                    return res.data.data;
                });
                resolve(mainCategories);

            }
        } catch (e) {
            reject(e);
        }
    }).then(async d => {
        if (!testCategories) {
            return axios.post(`${dbHost}category/add`, d).then(async (res) => {
                console.log('Main Categories [L1] Pushed to Collection');
                const l2 = await categoriesLevelTwo(res.data.data);
                return axios.post(`${dbHost}category/add`, l2).then(async (res) => {
                    console.log('Main Categories [L2] Pushed to Collection');
                });
            });
        } else {
            const l2 = await categoriesLevelTwo(d);
            return l2;
        }
    }).catch(e => {
        console.log(e);
    });
}


module.exports = { fetchAll: fetchMainCategory, categories };
