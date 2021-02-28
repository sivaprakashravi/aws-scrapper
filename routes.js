const express = require('express');
const cors = require('cors');
const messages = require('./utils/messages');
const app = express();
app.use(cors());
const routes = {
    MASTER: '/',
    AMAZONPARENT: '/amazon',
    SCRAPPER: '/amazon/scrapper',
    JOBS: '/amazon/jobs',
    CATEGORY: '/amazon/categories',
    DATA: '/amazon/data',
    AMAZONLOGIN: '/amazon/login'
};

module.exports = {
    get: async (route, callBack) => {
        app.get(routes[route], callBack)
    },
    listen: (port, callBack) => {
        app.listen(port, () => {
            process.setMaxListeners(Infinity);
            console.log(`${messages.APPRUNNING} ~~ ${port}`);
            callBack();
        });
    }
}