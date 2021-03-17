'use strict';

exports.type = 'full';

exports.active = true;

exports.description =
  'minifies styles and removes unused styles based on usage data';

exports.params = {
  // ... CSSO options goes here

  // additional
  usage: {
    force: false, // force to use usage data even if it unsafe (document contains <script> or on* attributes)
    ids: true,
    classes: true,
    tags: true,
  },
};

const csso = require('csso');

/**
 * Minifies styles (<style> element + style attribute) using CSSO
 *
 * @author strarsis <strarsis@gmail.com>
 */
exports.fn = function (ast, options) {
  options = options || {};

  const minifyOptionsForStylesheet = cloneObject(options);
  const minifyOptionsForAttribute = cloneObject(options);
  const elems = findStyleElems(ast);

  minifyOptionsForStylesheet.usage = collectUsageData(ast, options);
  minifyOptionsForAttribute.usage = null;

  elems.forEach((elem) => {
    if (elem.isElem('style')) {
      if (
        elem.children[0].type === 'text' ||
        elem.children[0].type === 'cdata'
      ) {
        const styleCss = elem.children[0].value;
        const minified = csso.minify(styleCss, minifyOptionsForStylesheet).css;
        // preserve cdata if necessary
        // TODO split cdata -> text optimisation into separate plugin
        if (styleCss.includes('>') || styleCss.includes('<')) {
          elem.children[0].type = 'cdata';
          elem.children[0].value = minified;
        } else {
          elem.children[0].type = 'text';
          elem.children[0].value = minified;
        }
      }
    } else {
      // style attribute
      const elemStyle = elem.attr('style').value;

      elem.attr('style').value = csso.minifyBlock(
        elemStyle,
        minifyOptionsForAttribute
      ).css;
    }
  });

  return ast;
};

function cloneObject(obj) {
  return { ...obj };
}

function findStyleElems(ast) {
  function walk(items, styles) {
    for (let i = 0; i < items.children.length; i++) {
      const item = items.children[i];

      // go deeper
      if (item.children) {
        walk(item, styles);
      }

      if (item.isElem('style') && item.children.length !== 0) {
        styles.push(item);
      } else if (item.type === 'element' && item.hasAttr('style')) {
        styles.push(item);
      }
    }

    return styles;
  }

  return walk(ast, []);
}

function shouldFilter(options, name) {
  if ('usage' in options === false) {
    return true;
  }

  if (options.usage && name in options.usage === false) {
    return true;
  }

  return Boolean(options.usage && options.usage[name]);
}

function collectUsageData(ast, options) {
  function walk(items, usageData) {
    for (let i = 0; i < items.children.length; i++) {
      const item = items.children[i];

      // go deeper
      if (item.children) {
        walk(item, usageData);
      }

      if (item.isElem('script')) {
        safe = false;
      }

      if (item.type === 'element') {
        usageData.tags[item.name] = true;

        if (item.hasAttr('id')) {
          usageData.ids[item.attr('id').value] = true;
        }

        if (item.hasAttr('class')) {
          item
            .attr('class')
            .value.replace(/^\s+|\s+$/g, '')
            .split(/\s+/)
            .forEach((className) => {
              usageData.classes[className] = true;
            });
        }

        if (
          item.attrs &&
          Object.keys(item.attrs).some((name) => {
            return /^on/i.test(name);
          })
        ) {
          safe = false;
        }
      }
    }

    return usageData;
  }

  var safe = true;
  const usageData = {};
  let hasData = false;
  const rawData = walk(ast, {
    ids: Object.create(null),
    classes: Object.create(null),
    tags: Object.create(null),
  });

  if (!safe && options.usage && options.usage.force) {
    safe = true;
  }

  for (const [key, data] of Object.entries(rawData)) {
    if (shouldFilter(options, key)) {
      usageData[key] = Object.keys(data);
      hasData = true;
    }
  }

  return safe && hasData ? usageData : null;
}
