const get = require('lodash/get');
const maxBy = require('lodash/maxBy');
const xml2js = require('xml2js');

const expandCaseVariations = (seed, sub) => {
  const variations = [...seed].reduce(
    (acc, char) => {
      const isUpper = char >= 'A' && char <= 'Z';
      return acc.flatMap((elem) => {
        if (isUpper) return [elem + char, elem + char.toLowerCase()];
        return [elem + char.toLowerCase()];
      });
    },
    ['']
  );

  const expanded = variations.map((v) => sub(v)).join(',');
  return expanded;
};

const selectMetaEvidence = async (page, name, attrName = 'name') => {
//   const evidenceName = `select:$(meta[${attrName}="${name}"])`;
  const expandedEvidenceName = expandCaseVariations(
    name,
    (s) => `meta[${attrName}="${s}"]`
  );
  try {
    const maybeAttr = await page.$eval(
      expandedEvidenceName,
      (element, attr) => {
        if (typeof attr !== 'string') {
          throw new TypeError(`attr ${attr} did not eval to string`);
        }
        const attrValue = element.getAttribute(attr);
        return { attrValue };
      },
      'content'
    );
    const { attrValue } = maybeAttr;
    if (maybeAttr === null || attrValue === null) console.log('empty selection');
    return attrValue;
  } catch (error) {
    console.log(error.message);
    return null;
  }
};

const selectAllMetaEvidence = async (page, name, attrName = 'name') => {
  const expandedEvidenceName = expandCaseVariations(
    name,
    (s) => `meta[${attrName}="${s}"]`
  );
  try {
    const elements = await page.$$(expandedEvidenceName);
    const contents = elements.map((element) => page.evaluate((p) => p.getAttribute('content'), element)
    );
    return contents;
  } catch (error) {
    console.log(error.message);
    return null;
  }
};

const selectElemTextEvidence = async (page, selector) => {
  //   const evidenceName = `select:$(${queryString})`
  const elements = await page.$$(selector);
  const element = elements[0];
  if (!element) return null;
  const textContent = await page.evaluate((p) => p.textContent, element);
  return textContent.trim();
};

const selectElemAttrEvidence = async (page, selector, contentAttr) => {
  try {
    const maybeAttr = await page.$eval(
      selector,
      (element, attr) => {
        if (typeof attr !== 'string') {
          throw new TypeError(`attr ${attr} did not eval to string`);
        }
        const attrValue = element.getAttribute(attr);
        return { attrValue };
      },
      contentAttr
    );
    const { attrValue } = maybeAttr;
    if (maybeAttr === null || attrValue === null) console.log('empty selection');
    return attrValue;
  } catch (error) {
    console.log(error.message);
    return null;
  }
};

const gatherHighwirePressTags = async (page) => {
  const evidence = await Promise.all(
    [
      { name: 'citation_title' },
      { name: 'citation_date' },
      { name: 'citation_pdf_url',type:'pdf' },
      { name: 'citation_abstract', type: 'abstract' },
    ].map(async ({ name, attrName, type }) => {
      const value = await selectMetaEvidence(page, name, attrName);
      return {
        name,
        type,
        value,
      };
    })
  );
  const evidences = await selectAllMetaEvidence(page, 'citation_author');
  return [...evidence, ...(evidences ?? [])];
};

const gatherOpenGraphTags = async (page) => {
  const evidence = await Promise.all(
    [
      { name: 'og:url' },
      { name: 'og:url', attrName: 'property' },
      { name: 'og:title' },
      { name: 'og:title', attrName: 'property' },
      { name: 'og:type' },
      { name: 'og:type', attrName: 'property' },
      { name: 'og:description', type: 'abstract' },
      { name: 'og:description', attrName: 'property', type: 'abstract' },
    ].map(async ({ name, attrName, type }) => {
      const value = await selectMetaEvidence(page, name, attrName);
      return {
        name,
        type,
        value,
      };
    })
  );
  return evidence;
};

const gatherDublinCoreTags = async (page) => {
  const evidence = await Promise.all(
    [
      { name: 'DC.Description' },
      { name: 'DCTERMS.Abstract', type: 'abstract' },
      { name: 'DC.Title' },
    ].map(async ({ name, attrName, type }) => {
      const value = await selectMetaEvidence(page, name, attrName);
      return { name, type, value };
    })
  );
//   const evidences = await Promise.all(
//     ['DC.Creator', 'DC.Subject', 'DC.Identifier', 'DC.Type'].map(
//       async (name) => selectAllMetaEvidence(page, name)
//     )
//   );

  return evidence;
};

const cleanAbstract = (abstract) => {
  if (!abstract) return null;
  const abstractCleaningRules = [
    {
      name: 'starts w/\'abstract\'',
      guards: [
        /^abstract/i
      ],
      run: (str) => {
        return str.replace(/^abstract */i, '');
      }
    },
    {
      name: 'starts w/\'motivation\'',
      guards: [
        /^motivation/i
      ],
      run: (str) => {
        return str.replace(/^motivation */i, '');
      }
    },
    {
      name: 'clip @ \'References\'',
      guards: [
        /(References|REFERENCES)/
      ],
      run: (str) => {
        const regex = /(References|REFERENCES).*$/;
        return str.replace(regex, '');
      }
    },
    {
      name: 'clip @ \'Keywords\'',
      guards: [
        /(Keywords).*$/
      ],
      run: (str, guards) => {
        const regex = guards[0];
        return str.replace(regex, '');
      }
    },
    {
      name: 'starts w/non-word',
      guards: [
        /^\W+/i
      ],
      run: (str, guards) => {
        const regex = guards[0];
        return str.replace(regex, '');
      }
    },
    {
      name: 'clip @ Cite This Paper',
      guards: [
        /cite this paper abstract/i
      ],
      run: (str, guards) => {
        const regex = guards[0];
        let [, post] = str.split(regex);
        post = post ? post.trim() : '';
        return post;
      }
    },
    {
      name: 'clip @ Disqus comments',
      guards: [
        /comments[\d ]+comments.*$/i
      ],
      run: (str, guards) => {
        const regex = guards[0];
        return str.replace(regex, '');
      }
    },
    {
      name: 'clip @ trailing tags <.. />',
      guards: [
        /<etx.*$/i
      ],
      run: (str, guards) => {
        const regex = guards[0];
        return str.replace(regex, '');
      }
    },
    {
      name: 'clip @ trailing <',
      guards: [
        /<$/i
      ],
      run: (str, guards) => {
        const regex = guards[0];
        return str.replace(regex, '');
      }
    },
    {
      name: 'remove newlines',
      guards: [
      ],
      run: (str) => {
        return str.split('\n').flatMap(p => p.trim()?.length? p.trim(): []).join(' ');
      }
    },
    {
      name: 'trim extra space',
      guards: [
        / {2,}/g
      ],
      run: (str) => {
        const regex = / +/gm;
        return str.replace(regex, ' ');
      }
    },
    {
      name: 'clip @ \'Full Text: PDF\'',
      guards: [
        /(Full Text:).*$/
      ],
      run: (str, guards) => {
        const regex = guards[0];
        return str.replace(regex, '');
      }
    },
    {
      name: 'clip @ \'Related Material\'',
      guards: [
        /Related Material.*$/
      ],
      run: (str, guards) => {
        const regex = guards[0];
        return str.replace(regex, '');
      }
    },
    {
      name: 'clip before /Graphical abstract Download/',
      guards: [
        /graphical abstract download/i
      ],
      run: (str, guards) => {
        const regex = guards[0];
        let [pre,] = str.split(regex);
        pre = pre ? pre.trim() : '';
        return pre;
      }
    },
    {
      name: 'Catch-alls: e.g., /^Home Page Papers|^Complexity/..',
      guards: [
        /home page papers/i,
        /Complexity . Journal Menu/,
        /no abstract available/i,
        /^download.article/i,
        /open access article/i,
        /For authors For reviewers/,
        /banner art adapted from/i,
        /a collection of accepted abstracts/i,
      ],
      run: () => ''
    },
    {
      name: '/Home Archives/ >> maybe /Abstract.*/',
      guards: [
        /^Home Archives/
      ],
      run: (str) => {
        const regex = /Abstract/;
        let [, post] = str.split(regex);
        post = post ? post.trim() : '';
        return post;
      }
    }
  ];

  let cleanAbstract = abstract;
  abstractCleaningRules.forEach((rule) => {
    const { guards, run } = rule;
    const shouldRun = !guards.length || guards.some((guardRegex) => guardRegex.test(abstract));
    if (shouldRun) {
      const cleanResult = run(cleanAbstract, guards);
      if (cleanResult && cleanResult !== cleanAbstract) {
        console.log(`cleaning rule: ${rule.name}`);
        cleanAbstract = cleanResult;
      }
    }
  });

  return cleanAbstract;
};

const cleanPdf = (pdf,page) => {
  if (!pdf) return null;
  const cleanPdf = pdf.trim();
  if (cleanPdf.startsWith('/')) {
    const fullUrl = new URL(cleanPdf, page.url());
    return fullUrl.href;
  }
  return cleanPdf;
};

const arxivOrgRule = {
  shouldApplyRule: (url) => /export.arxiv.org/.test(url),
  executeRule: async(html) => {
    console.log(' run arxiv rule');
    const xmlObject = await xml2js.parseStringPromise(html);
    const summary = get(xmlObject, 'feed.entry.0.summary')?.toString();
    const title = get(xmlObject, 'feed.entry.0.title')?.toString();

    const links = get(xmlObject, ['feed', 'entry', '0', 'link']);
    const pdfLink = links?.find((p) => p?.$?.type === 'application/pdf')?.$?.href;

    const allEvidence = [
      { type: 'abstract', value: summary },
      { type: 'abstract', value: title },
      {type: 'pdf', value: pdfLink}
    ];
    return {
      abstract:allEvidence.find(
      (p) => p?.type === 'abstract' && p.value
    )?.value,
    pdf:allEvidence.find(
      (p) => p?.type === 'pdf' && p.value
    )?.value};
  },
};

const scienceDirectRule = {
  shouldApplyRule: (url) => /sciencedirect.com/.test(url),
  executeRule: async (html, page) => {
    console.log(' run sciencedirect rule');
    const highwirePressTags = await gatherHighwirePressTags(page);
    const openGraphTags = await gatherOpenGraphTags(page);
    const abstractClass = await selectElemTextEvidence(page, '.abstract');
    const pdf = await selectElemAttrEvidence(page, 'div.PdfEmbed a.anchor', 'href');

    const allEvidence = [
      ...highwirePressTags,
      { type: 'abstract', value: abstractClass },
      ...openGraphTags,
      { type: 'pdf', value: pdf }
    ];
    return {
      abstract:allEvidence.find(
      (p) => p?.type === 'abstract' && p.value
    )?.value,
    pdf:allEvidence.find(
      (p) => p?.type === 'pdf' && p.value
    )?.value};
  },
};

const aaaiOrgRule = {
  shouldApplyRule: (url) => /\/aaai.org/.test(url),
  executeRule: async (html, page) => {
    console.log(' run aaai rule');
    const sections = await page.$$('h4');

    let abstract = null;
    let pdf = null;
    for (let index = 0; index < sections.length; index++) {
      const textContent = await page.evaluate((p) => p.textContent, sections[index]);
      if (textContent==='Abstract:'){
        const abstractContentElement = await sections[index].evaluateHandle(el => el.nextElementSibling);
        abstract = await page.evaluate((p) => p.textContent, abstractContentElement);

      }
      if (textContent==='Downloads:'){
        const pdfElement = await sections[index].evaluateHandle(el => el.nextElementSibling.firstChild);
        pdf = await page.evaluate((p) => p.href, pdfElement);
      }
    }

    const allEvidence = [
      { type: 'abstract', value: abstract },
      { type: 'pdf', value: pdf }
    ];
    return {
      abstract:allEvidence.find(
      (p) => p?.type === 'abstract' && p.value
    )?.value,
    pdf:allEvidence.find(
      (p) => p?.type === 'pdf' && p.value
    )?.value};
  },
};

const aclanthologyRule = {
  shouldApplyRule: (url) => /aclanthology.org/.test(url),
  executeRule: async (html, page) => {
    console.log(' run aclanthology rule');
    const highwirePressTags = await gatherHighwirePressTags(page);
    const openGraphTags = await gatherOpenGraphTags(page);
    const abstractClass = await selectElemTextEvidence(page, '.acl-abstract');
    const pdf = await selectElemAttrEvidence(page, '.pdf-link', 'href');

    const allEvidence = [
      ...highwirePressTags,
      ...openGraphTags,
      { type: 'abstract', value: abstractClass },
      { type: 'pdf', value: pdf }
    ];

    const abstractEvidences = allEvidence.filter(
      (p) => p?.type === 'abstract' && p.value
    );

    const longestAbstractEvidence = maxBy(abstractEvidences, 'value.length');
    return {
      abstract:longestAbstractEvidence?.value,
      pdf:allEvidence.find(
        (p) => p?.type === 'pdf' && p.value
      )?.value};
  }
};

const nipsCCRule = {
  shouldApplyRule: (url) => /nips.cc/.test(url),
  executeRule: async (html, page) => {
    console.log(' run nips rule');

    const highwirePressTags = await gatherHighwirePressTags(page);
    const abstract = await selectElemTextEvidence(page, 'h4 + p');

    const allEvidence = [
      ...highwirePressTags,
      { type: 'abstract', value: abstract }
    ];

    const abstractEvidences = allEvidence.filter(
      (p) => p?.type === 'abstract' && p.value
    );

    const longestAbstractEvidence = maxBy(abstractEvidences, 'value.length');
    return {
      abstract:longestAbstractEvidence?.value,
      pdf:allEvidence.find(
        (p) => p?.type === 'pdf' && p.value
      )?.value};
  }
};

const neuripsCCRule = {
  shouldApplyRule: (url) => /neurips.cc/.test(url),
  executeRule: async (html, page) => {
    console.log(' run neurips.cc rule');
    const highwirePressTags = await gatherHighwirePressTags(page);

    const sections = await page.$$('h4');

    let abstract = null;
    for (let index = 0; index < sections.length; index++) {
      const textContent = await page.evaluate((p) => p.textContent, sections[index]);
      if (textContent==='Abstract'){
        const abstractContentElement = await sections[index].evaluateHandle(el => el.nextElementSibling.nextElementSibling);
        abstract = await page.evaluate((p) => p.textContent, abstractContentElement);

      }
    }

    const allEvidence = [
      ...highwirePressTags,
      { type: 'abstract', value: abstract }
    ];

    const abstractEvidences = allEvidence.filter(
      (p) => p?.type === 'abstract' && p.value
    );

    const longestAbstractEvidence = maxBy(abstractEvidences, 'value.length');
    return {
      abstract:longestAbstractEvidence?.value,
      pdf:allEvidence.find(
        (p) => p?.type === 'pdf' && p.value
      )?.value};
  }
};

const openreviewRule = {
  shouldApplyRule: (url) => /openreview.net/.test(url),
  executeRule: async (html, page) => {
    console.log(' run openreview.net rule');
    return {result:'stop'};
  }
};

const dlAcmOrgRule = {
  shouldApplyRule: (url) => /dl.acm.org/.test(url),
  executeRule: async (html, page) => {
    console.log(' run dl.acm.org rule');
    const dublinCoreTags = await gatherDublinCoreTags(page);
    const abstractInFull = await selectElemTextEvidence(page, '.abstractInFull');
    const pdf = await selectElemAttrEvidence(page, 'a[title="PDF"]', 'href');

    const allEvidence = [
      ...dublinCoreTags,
      { type: 'abstract', value: abstractInFull },
      { type: 'pdf', value: pdf }
    ];
    return {
      abstract:allEvidence.find(
      (p) => p?.type === 'abstract' && p.value
    )?.value,
    pdf:allEvidence.find(
      (p) => p?.type === 'pdf' && p.value
    )?.value};
  }
};

const generalRule = {
  shouldApplyRule: (url) => true,
  executeRule: async (html, page) => {
    console.log(' run general rule');
    const highwirePressTags = await gatherHighwirePressTags(page);
    const openGraphTags = await gatherOpenGraphTags(page);
    const dublinCoreTags = await gatherDublinCoreTags(page);
    const description = await selectMetaEvidence(page, 'description');
    const abstractClass = await selectElemTextEvidence(page, '.abstract');
    const abstractId = await selectElemTextEvidence(page, '#abstract');
    const upperAbstractId = await selectElemTextEvidence(page, '#Abstract');
    const abstractInFullClass = await selectElemTextEvidence(
      page,
      '.abstractInFull'
    );

    const allEvidence = [
      ...highwirePressTags,
      ...openGraphTags,
      ...dublinCoreTags,
      { type: 'abstract', value: description },
      { type: 'abstract', value: abstractClass },
      { type: 'abstract', value: abstractId },
      { type: 'abstract', value: upperAbstractId },
      { type: 'abstract', value: abstractInFullClass },
    ];


    const abstractEvidences = allEvidence.filter(
      (p) => p?.type === 'abstract' && p.value
    );

    const longestAbstractEvidence = maxBy(abstractEvidences, 'value.length');
    return {
      abstract:longestAbstractEvidence?.value,
      pdf:allEvidence.find(
        (p) => p?.type === 'pdf' && p.value
      )?.value
    };
  }
};

const runAllRules = async (html, page, url) => {
  // run through all rules if should apply
  const rules = [openreviewRule, arxivOrgRule, scienceDirectRule, aaaiOrgRule, aclanthologyRule, nipsCCRule, neuripsCCRule, dlAcmOrgRule, generalRule];
  const applicableRules = rules.filter((rule) => rule.shouldApplyRule(url));

  for (const rule of applicableRules) {
    const { abstract, pdf, result } = await rule.executeRule(html, page);

    if (result === 'stop') {
      return {};
    }

    if (abstract || pdf) {
      return {
        abstract: cleanAbstract(abstract),
        pdf: cleanPdf(pdf, page)
      };
    }
  }

  return {};
};

module.exports = runAllRules;
