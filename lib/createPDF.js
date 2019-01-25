const puppeteer = require('puppeteer');
const path = require('path');
const log = require('../lib/log');

const isPkg = typeof process.pkg !== 'undefined';
const chromiumExecutablePath = (isPkg ?
    puppeteer.executablePath().replace(
        process.platform == 'win32'
            ? /^.*?\\node_modules\\puppeteer\\\.local-chromium/
            : /^.*?\/node_modules\/puppeteer\/\.local-chromium/,
        path.join(path.dirname(process.execPath), 'chromium')
    ) :
    puppeteer.executablePath()
);

const createPDF = async (htmlDest, dest) => {
    try {
        const browser = await puppeteer.launch({executablePath: chromiumExecutablePath});
        const page = await browser.newPage();
        await page.goto(`file://${htmlDest}`);
        await page.pdf({path: dest, format: 'A4', margin: {top: '40px', bottom: '40px'}});

        await browser.close();
    } catch (err) {
        log.error(err);
    }
};

module.exports = createPDF;
