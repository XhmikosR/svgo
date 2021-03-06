'use strict';

const { parseName } = require('../lib/svgo/tools.js');

exports.type = 'full';

exports.active = true;

exports.description = 'removes unused namespaces declaration';

/**
 * Remove unused namespaces declaration.
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (data) {
  var svgElem,
    xmlnsCollection = [];

  /**
   * Remove namespace from collection.
   *
   * @param {String} ns namescape name
   */
  function removeNSfromCollection(ns) {
    var pos = xmlnsCollection.indexOf(ns);

    // if found - remove ns from the namespaces collection
    if (pos > -1) {
      xmlnsCollection.splice(pos, 1);
    }
  }

  /**
   * Bananas!
   *
   * @param {Array} items input items
   *
   * @return {Array} output items
   */
  function monkeys(items) {
    var i = 0,
      length = items.children.length;

    while (i < length) {
      var item = items.children[i];

      if (item.isElem('svg')) {
        item.eachAttr(function (attr) {
          const { prefix, local } = parseName(attr.name);
          // collect namespaces
          if (prefix === 'xmlns' && local) {
            xmlnsCollection.push(local);
          }
        });

        // if svg element has ns-attr
        if (xmlnsCollection.length) {
          // save svg element
          svgElem = item;
        }
      }

      if (xmlnsCollection.length) {
        const { prefix } = parseName(item.name);
        // check item for the ns-attrs
        if (prefix) {
          removeNSfromCollection(prefix);
        }

        // check each attr for the ns-attrs
        item.eachAttr(function (attr) {
          const { prefix } = parseName(attr.name);
          removeNSfromCollection(prefix);
        });
      }

      // if nothing is found - go deeper
      if (xmlnsCollection.length && item.children) {
        monkeys(item);
      }

      i++;
    }

    return items;
  }

  data = monkeys(data);

  // remove svg element ns-attributes if they are not used even once
  if (xmlnsCollection.length) {
    xmlnsCollection.forEach(function (name) {
      svgElem.removeAttr('xmlns:' + name);
    });
  }

  return data;
};
