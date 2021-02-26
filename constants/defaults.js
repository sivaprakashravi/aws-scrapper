const port = 8000;
const host = 'https://www.amazon.com';
const login = `${host}ap/signin?openid.pape.max_auth_age=0&openid.return_to=https://www.amazon.in/ref=nav_ya_signin&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select&openid.ns=http://specs.openid.net/auth/2.0`;
const dbHost = "http://localhost:8001/";
const jQ = "./libs/jquery-3.5.1.slim.min.js";
const storage = {
    port: 8001
}
module.exports = { port, host, login, dbHost, jQ, storage };