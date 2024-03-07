import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AnonPlugin from 'puppeteer-extra-plugin-anonymize-ua';
import { tidy as htmlTidy } from 'htmltidy2';
import { runAllRules } from './abstractExtractionRules.js';
import {
  shouldEnableJavaScript,
  htmlTidyOptions,
  urlWriteRegexMap,
  initRequestInterception,
  rewriteUrl,
  shouldEnableMultiRedirect,
  getTimeout
} from './helpers.js';

const extractAbstract = async (url, skipTidy = false) => {
  let extractionResult = {abstract:null,pdf:null,error:null};
  const enableJavaScript = shouldEnableJavaScript(url);
  const isRewritable = urlWriteRegexMap.some((p) => p.regex.test(url));
  puppeteer.use(StealthPlugin());
  puppeteer.use(AnonPlugin());

  const browserInstance = await puppeteer.launch({
    headless: 'new',
  });

  const page = await browserInstance.newPage();
  const timeout = getTimeout(url);
  page.setDefaultNavigationTimeout(timeout);
  page.setDefaultTimeout(timeout);
  page.setJavaScriptEnabled(enableJavaScript);
  await page.setRequestInterception(true);
  initRequestInterception(page, enableJavaScript, isRewritable);

  try {
    if (isRewritable) {
      const rewrittenUrl = rewriteUrl(url);
      if (rewrittenUrl) {
        console.log(`Rewriting ${url} to ${rewrittenUrl}`);
        await browserInstance.close();
        return extractAbstract(rewrittenUrl, true);
      }
    }

    const response = await page.goto(url, {
      waitUntil: enableJavaScript ? 'networkidle0' : 'domcontentloaded',
    });
    if (response === null) {
      console.log(`null HTTPResponse to ${url}`);
      // eslint-disable-next-line no-throw-literal
      throw { message: 'rewrite', responseUrl: response.url() };
    }
    // status filter
    const status = response.status().toString();
    console.log(`HTTP status code: ${status}`);

    if (shouldEnableMultiRedirect(response.url())){
      await browserInstance.close();
      if (status.startsWith('3')) {
        console.log(`Redirecting to ${response.url()}`);
        return extractAbstract(response.url(), true);
      } else {
        throw new Error(`HTTP status code: ${status}`);
      }
    }
    // normalizeHtmls
    const rawHtml = await response.text();
    const tidyHtml = skipTidy? rawHtml: await new Promise((resolve, reject) => {
      htmlTidy(rawHtml, htmlTidyOptions, (err, html) => {
        if (err) reject(err);
        else resolve(html);
      });
    });

    extractionResult = await runAllRules(tidyHtml, page, response.url());
  } catch (error) {
    extractionResult.error = error.message;
  }
  await browserInstance.close();
  return extractionResult;
};

export {
  extractAbstract
};
