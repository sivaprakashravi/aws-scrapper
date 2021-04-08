

const { amazonScrapper, extractProdInformation } = require('./request-handler');
const { jobLog } = require('./../utils/handlers');
const _ = require('lodash');
const scrapper = async (job) => {
    const { category, subCategory, subCategory1 } = job;
    console.log(`Scrap URL: ${job.url}`);
    const { pageNo, list } = await amazonScrapper(job.url, category.nId, subCategory.nId, subCategory1.nId);
    // count = + list.length;
    const prodsPerPage = list.length;
    let { from, to } = job;
    from = from ? Number(from) : 0;
    to = to ? Number(to) : 100;
    let threshold = (to - from);
    if(threshold > (pageNo * prodsPerPage)) {
        const message = `${job.scheduleId} - Threshold is Higher than available products: ${threshold} / ${pageNo * prodsPerPage}`; 
        console.log(message);
        from = 0;
        threshold = pageNo * prodsPerPage;
        jobLog(message);
    }
    if (pageNo && pageNo > 1) {
        return new Promise(async (resolve, reject) => {
            try {
                let data = [];
                let count = 0;
                for (let i = 1; i <= pageNo; i++) { // insert loop
                    if (i >= (from / prodsPerPage)) {
                        const loopedData = await amazonScrapper(job.url, category.nId, subCategory.nId, subCategory1.nId, i+1);
                        loopedData.list = loopedData.list.filter(l => l);
                        data = data.concat(loopedData.list);
                        count = count + loopedData.list.length;
                        if (count >= threshold) {
                            resolve(data);
                            return;
                        }
                    }
                    if (i === pageNo) {
                        resolve(data);
                    }
                }
            } catch (e) {
                reject(e)
            }
        }).then(async (d) => {
            let response = list.concat(_.flatten(d));
            response = _.filter(response, r => r);
            response = _.filter(response, (r, i) => i < threshold);
            const addData = await extractProdInformation(response, job);
            return addData;
        }).catch(error => {
            console.log(error);
            return error;
        });
    }

}

module.exports = { scrapper };