const { port } = require('./constants/defaults');
const { amazonScrapper, amazonLogin } = require('./processors/request-handler');
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
const app = express();
app.use(cors());
app.get(routes.MASTER, (req, res) => {
    res.send(success(null, messages.MASTER));
});
app.get(routes.AMAZONPARENT, (req, res) => {
    res.send(success(null, messages.AMAZONPARENT));
});
app.get(routes.SCRAPPER, async (req, res) => {
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
                res.send(success(response));
            });
        }
    } else {
        res.send(error(messages.NOSEARCHKEY));
    }
});

app.get('/amazon/login', async (req, res) => {
    const status = await amazonLogin();
    res.send({});
})

app.listen(port, () => {
    console.log(`${messages.APPRUNNING} ~~ ${port}`);
});