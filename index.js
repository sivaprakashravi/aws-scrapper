const { port } = require('./constants/defaults');
const { amazonScrapper } = require('./processors/request-handler');
const express = require('express');
const _ = require('lodash');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;
const $ = jQuery = require('jquery')(window);
const app = express();

app.get('/', async(req, res) => {
    res.send({message: 'Master Route Scrapping'});
});
app.get('/amazon', async(req, res) => {
    res.send({message: 'Parent Route Amazon Scrapping'});
});
app.get('/amazon/pull', async (req, res) => {
    const threshold = 100;
    let count = 0;
    if (req && req.query && req.query.key) {
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
                        console.log(count);
                    } else {
                        resolve(data);
                        break;
                    }
                    if (i === pageNo) {
                        resolve(data);
                    }
                }
            }).then(d => {
                let response = list.concat(_.flatten(d));
                response = _.filter(response, (r, i) => i < threshold);
                res.send({response});
            });
        }
    } else {
        res.send([]);
    }
});

app.listen(port, () => {
    console.log(`App Running ~~ ${port}`);
});