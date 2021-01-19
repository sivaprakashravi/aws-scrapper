var { port } = require('./constants/defaults');
var _ = require('lodash');
const https = require('https');
var express = require('express');
var app = express();

app.get('/', (req, res) => {
    if(req && req.query && req.query.key) {
        https.get(`https://www.amazon.in/s/query?k=${req.query.key}`, html => {
            html.setEncoding('utf8');
            let body = ''; 
            html.on('data', (chunk) => {
                body += chunk;
            });
            html.on('end', () => { 
                let mixed = '';           
                body =  body.replace(/\n/g, '');
                body = body.split('&&&');
                body = _.filter(body, (l) => _.includes(l, 'search'));
                body = _.map(body, b => {
                    const parsedBody = JSON.parse(b);
                    const {html} =  _.find(parsedBody, p => typeof p !== 'string');
                    mixed += html;
                });
                let bodyString = `<html><style type="text/css">html, body {padding: 0; margin: 0} body > div {width: 24%; display: inline-block; }</style><body>${mixed}</body></html>`
                res.write(bodyString);
            });
        });
    } else {        
        let bodyString = `<html><body>No Search Object</body></html>`
        res.write(bodyString);
    }
})

app.listen(port, () => {
    console.log(`App Running ~~ ${port}`);
});