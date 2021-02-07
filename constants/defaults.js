const port = 8000;
const host = 'https://www.amazon.in/';
const login = `${host}ap/signin?openid.pape.max_auth_age=0&openid.return_to=https://www.amazon.in/ref=nav_ya_signin&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select&openid.ns=http://specs.openid.net/auth/2.0`;
module.exports = { port, host, login };