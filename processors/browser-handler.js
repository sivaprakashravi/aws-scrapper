
// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin());
const { jQ } = require('./../constants/defaults');
const os = require('check-os');
const args = [
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--no-first-run",
    "--no-zygote",
    "--single-process",
];
let executablePath = "./node_modules/puppeteer/.local-chromium/win64-848005/chrome-win/chrome.exe";
if (os.isLinux) {
    // executablePath = "./node_modules/puppeteer/.local-chromium/linux-848005/chrome-linux/chrome";
    executablePath = "/usr/bin/chromium-browser";
}
const headless = true;
let browserInstance;
const browser = async () => {
    if (!browserInstance || (browserInstance && !browserInstance.isConnected())) {
        if (browserInstance && !browserInstance.isConnected()) {
            browserInstance.close();
            browserInstance = null;
        }
        browserInstance = await puppeteer.launch({
            headless,
            executablePath,
            args
        });
    }
    return browserInstance;
};
const page = async (url) => {
    const b = await browser();
    // console.log(`Browser Page Opened!`);
    const newPage = await b.newPage();
    // newPage.timeOn = new Date().getTime();
    try {
        // await page.setViewport({ width: 1366, height: 768 });
        // await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36');
        await newPage.goto(url, { waitUntil: 'networkidle0', timeout: 0 });
        await newPage.addScriptTag({ path: jQ });
        // if (browserIsNew) {
        //     const isCtrySelected = await newPage.evaluate(() => {
        //         const countrySelected = $('#glow-ingress-line2').text();
        //         return countrySelected === 'Indonesia';
        //     });
        //     if (!isCtrySelected) {
        //         await pageLoaded.click('#nav-global-location-data-modal-action');
        //         await pageLoaded.waitForSelector('#GLUXCountryList');
        //         await pageLoaded.click('#GLUXCountryList');
        //         await pageLoaded.waitForSelector('#GLUXCountryList');
        //         await pageLoaded.click('#GLUXCountryList_107');
        //         await pageLoaded.waitForSelector('.a-popover-footer span.a-button.a-button-primary');
        //         await pageLoaded.click('.a-popover-footer span.a-button.a-button-primary');
        //         pageLoaded.close();
        //         pageLoaded = await page(url);
        //     }
        // }
        return newPage;
    } catch (error) {
        await newPage.close();
        // console.log(`Browser Page Closed on Error!`);
    }
}

const html = async (pageLoaded, callback) => {
    await pageLoaded.evaluate(() => {
        callback();
        pageLoaded.close();
        // console.log(`Browser Page Closed!`);
    });
}

const browserIsOpen = () => browserInstance && browserInstance.isConnected();

module.exports = { browser, page, html, browserIsOpen };