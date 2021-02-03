var { port } = require('./constants/defaults');
var { looper } = require('./processors/request-handler');
var express = require('express');

var jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);

var app = express();

app.get('/', async (req, res) => {
    if (req && req.query && req.query.key) {
        let pages = 0;
        const { htmlString, pageNo, list } = await looper(req.query.key);
        let bodyString = `<style type="text/css">html, body {padding: 0; margin: 0} body > div {width: 24%; display: inline-block; }</style><body>${htmlString}</body>`;
        $(bodyString).appendTo('html');
        // pages = $('.template=PAGINATION').find('.a-disabled').text();
        // console.log(pages);
        // res.write($('html').html());
        res.send(list);
    } else {
        let bodyString = `<html><body>No Search Object</body></html>`;
        res.write(bodyString);
    }
})

app.listen(port, () => {
    console.log(`App Running ~~ ${port}`);
});