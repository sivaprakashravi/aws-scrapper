

const { amazonScrapper, extractProdInformation } = require('./request-handler');

const scrapper = async (job) => {
    console.log(`Scrap URL: ${job.url}`);
    const { pageNo, list } = await amazonScrapper(job.url);
    count = + list.length;
    if (pageNo && pageNo > 1) {
        return new Promise(async (resolve, reject) => {
            let data = [];
            for (let i = 2; i <= pageNo; i++) {
                if (count < threshold) {
                    const loopedData = await amazonScrapper(job.url, i);
                    data = data.concat(loopedData.list);
                    count = count + loopedData.list.length;
                } else {
                    resolve(data);
                    break;
                }
                if (i === pageNo) {
                    resolve(data);
                }
            }
        }).then(async (d) => {
            let response = list.concat(_.flatten(d));
            response = _.filter(response, (r, i) => i < threshold);
            const addData = await extractProdInformation(response, job);
            return addData;
        });
    }

}

module.exports = { scrapper };