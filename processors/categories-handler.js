const { host } = require('./../constants/defaults');
const { browser, page, html } = require('./../processors/browser-handler');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const $ = jQuery = require('jquery')(window);
const _ = require('lodash');

const fetchMainCategory = (async () => {
    const url = host;
    const pageLoaded = await page(url);
    const primaryCategories = await pageLoaded.evaluate(() => {
        if ($('#searchDropdownBox').html()) {
            const options = $('#searchDropdownBox option');
            const list = [];
            $(options).each((i, option) => {
                if (i) {
                    list.push({
                        name: $(option).text(),
                        value: $(option).val(),
                        treeIndex: 0
                    });
                }
            });
            return list;
        }
    });
    await pageLoaded.close();
    return primaryCategories;
});

categoryInstance = (async (category) => {
    if (category && category.value) {
        const url = `${host}/s/ref=nb_sb_noss?url=${category.value}`;
        // https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Darts-crafts-intl-ship
        const pageLoaded = await page(url);
        const pageScrapped = await pageLoaded.evaluate(() => {
            const refinements = $("#s-refinements div.a-section.a-spacing-none:contains('Department')").find('ul li a');
            const levelOne = [];
            const mainCategories = [];
            let catId;
            $(refinements).each((i, refinement) => {
                catId = null;
                const href = $(refinement).attr('href');
                const name = $(refinement).find('span').text();
                const urlParams = new URLSearchParams(href);
                let rh = urlParams.get('rh');
                let nIds = rh.split(',');
                nIds = nIds.map(n => n.split(":").pop());
                if (nIds[1]) {
                    catId = nIds[0];
                    levelOne.push({
                        name,
                        nId: nIds[1],
                        treeIndex: 1
                    });
                } else {
                    mainCategories.push({
                        name,
                        nId: nIds[0],
                        treeIndex: 0
                    });
                }
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
        }
    }
    await fetcherLoop();
    if (additionalCategories && additionalCategories.length) {
        categoriesList = _.concat(categoriesList, additionalCategories);
    }
    categoriesList = categoriesList.filter(c => !c.remove);
    return categoriesList;
});

const categories = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const mainCategories = await fetchMainCategory();
            // resolve(mainCategories);
            if (mainCategories && mainCategories.length) {
                const splitted = await categoriesLevelOne(mainCategories);
                resolve(splitted);
            }
        } catch (e) {
            reject(e);
        }
    }).then(d => d);
}


module.exports = { fetchAll: fetchMainCategory, categories };
