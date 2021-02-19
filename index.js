const { port } = require('./constants/defaults');
const { amazonScrapper, extractProdInformation, pushtoDB, getFromDB, categories, amazonLogin } = require('./processors/request-handler');
const { success, error } = require('./utils/handlers');
const messages = require('./utils/messages');
const routes = require('./routes');
const express = require('express');
const _ = require('lodash');
const cors = require('cors');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
const $ = jQuery = require('jquery')(window);
process.setMaxListeners(Infinity);
const app = express();
app.use(cors());
let activeJobs = [];
app.get(routes.MASTER, (req, res) => {
    console.log(`Path: ${routes.MASTER}`);
    res.send(success(null, messages.MASTER));
});
app.get(routes.AMAZONPARENT, (req, res) => {
    console.log(`Path: ${routes.AMAZONPARENT}`);
    res.send(success(null, messages.AMAZONPARENT));
});
app.get(routes.CATEGORY, async (req, res) => {
    console.log(`Path: ${routes.CATEGORY}`);
    const categoriesList = await categories();
    res.send(success(categoriesList));
});
app.get(routes.DATA, async (req, res) => {
    console.log(`Path: ${routes.DATA}`);
    const list = await getFromDB();
    res.send(success(list));
});
app.get(routes.SCRAPPER, async (req, res) => {
    req.started = new Date().getTime();
    const threshold = 100;
    let count = 0;
    console.log(`Path: ${routes.SCRAPPER}`);
    console.log(`Threshold: ${threshold}`);
    if (req && req.query && req.query.key) {
        console.log(`Search Key: ${req.query.key}`);
        const jobInit = { job: req.query.key, status: 'Job Started' };
        activeJobs = activeJobs.filter(a => a.job !== req.query.key);
        activeJobs.push(jobInit);
        res.send(success(jobInit));
        const { pageNo, list } = await amazonScrapper(req.query.key);
        count = + list.length;
        if (pageNo && pageNo > 1) {
            new Promise(async (resolve, reject) => {
                let data = [];
                for (let i = 2; i <= pageNo; i++) {
                    if (count < threshold) {
                        const loopedData = await amazonScrapper(req.query.key, i);
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
                const addData = await extractProdInformation(response);
                const publishtoDB = await pushtoDB(addData);
                if (publishtoDB) {
                    activeJobs.find(j => j.job === req.query.key).status = 'Job Completed';
                } else {
                    activeJobs.find(j => j.job === req.query.key).status = 'Job Error';
                }
                const started = req.started;
                console.log(`Scrap key ${req.query.key} with threshold ${threshold} took ${(new Date().getTime() - started) / 1000} Seconds`);
                // if (publishtoDB) {
                //     res.send(success(addData));
                // } else {
                //     res.send(error());
                // }
            });
        }
    } else {
        res.send(error(messages.NOSEARCHKEY));
    }
});

app.get(routes.JOBS, async (req, res) => {
    res.send(success(activeJobs));
})

app.get('/amazon/login', async (req, res) => {
    const status = await amazonLogin();
    res.send({});
})

app.listen(port, () => {
    console.log(`${messages.APPRUNNING} ~~ ${port}`);
});