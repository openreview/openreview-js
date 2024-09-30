const shouldEnableJavaScript = (url) => [/linkinghub.elsevier.com/, /aaai.org/, /isca-speech.org/].some((regex) => regex.test(url));

const shouldEnableMultiRedirect = (url) => [/doi.org/, /linkinghub.elsevier.com/].some((regex) => regex.test(url));

const getTimeout = (url) => {
  const defaultTimeout = 15_000;
  if ([/doi.org/, /spiedigitallibrary.org/, /iospress.com/,/export.arxiv.org/].some((regex) => regex.test(url))) return defaultTimeout*3;
  return defaultTimeout;
};

const htmlTidyOptions = [
  'clean: no',
  'custom-tags: blocklevel',
  'drop-empty-elements: no',
  'drop-empty-paras: no',
  'force-output: yes',
  'indent-cdata: yes',
  'indent-spaces: 4',
  'indent: yes',
  'join-styles: no',
  'markup: yes',
  'merge-divs: no',
  'merge-spans: no',
  'output-xhtml: yes',
  'tab-size: 4',
  'tidy-mark: no',
  'wrap-asp: no',
  'wrap-attributes: no',
  'wrap-jste: no',
  'wrap-php: no',
  'wrap-script-literals: no',
  'wrap-sections: no',
  'wrap: 0',
];

const urlWriteRegexMap = [
  {
    regex: /\/arxiv.org\/abs/,
    rewriteRegex: /arxiv.org\/abs\/(.*)$/,
  },
  {
    regex: /\/doi.org\/.+\/arXiv/,
    rewriteRegex: /arXiv.(.*)$/,
  },
];

const initRequestInterception = (page, enableJavaScript, isRewritable) => {
  if (!page.browser().process()?.pid) return;
  page.on('request', async (interceptedRequest) => {
    if (interceptedRequest.isInterceptResolutionHandled()) return;
    const url = interceptedRequest.url();
    const resType = interceptedRequest.resourceType();
    const allowedResources = enableJavaScript
      ? ['document', 'script']
      : ['document'];
    if (!allowedResources.includes(resType)) {
      interceptedRequest.abort('aborted' /* = ErrorCode*/);
      return;
    }

    if (isRewritable) {
      console.log(`Aborting rewritable url ${url}`);
      interceptedRequest.abort('blockedbyclient');
      return;
    }

    await interceptedRequest.continue(
      interceptedRequest.continueRequestOverrides(),
      0
    );
  });
};

const rewriteUrl = (srcUrl) => {
  const rewriteRegex = urlWriteRegexMap.find((p) => p.regex.test(srcUrl)
  )?.rewriteRegex;
  if (!rewriteRegex) return;
  const matches = srcUrl.match(rewriteRegex);
  if (matches === null || matches.length < 2) return;
  const arxivId = matches[1];
  return `http://export.arxiv.org/api/query?id_list=${arxivId}`;
};

export {
  shouldEnableJavaScript,
  shouldEnableMultiRedirect,
  htmlTidyOptions,
  urlWriteRegexMap,
  initRequestInterception,
  rewriteUrl,
  getTimeout
};
