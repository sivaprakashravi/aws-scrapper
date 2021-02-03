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

app.get('/', async (req, res) => {
    const threshold = 100;
    let count = 0;
    if (req && req.query && req.query.key) {
        const { pageNo, list } = await amazonScrapper(req.query.key);
        count = + list.length;
        const promisesLoop = [];
        if (pageNo && pageNo > 1) {
            for (let i = 2; i <= pageNo; i++) {
                promisesLoop.push(new Promise(async (resolve, reject) => {
                    const loopedData = await amazonScrapper(req.query.key, i);
                    console.log(i, loopedData.list.length);
                    resolve(loopedData.list);
                }));
            }
        }
        Promise.all(promisesLoop).then(d => {
            res.send(list.concat(_.flatten(d)));
        });

    } else {
        res.send([]);
    }
})

app.listen(port, () => {
    console.log(`App Running ~~ ${port}`);
});