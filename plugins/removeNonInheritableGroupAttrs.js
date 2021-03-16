'use strict';

exports.type = 'perItem';

exports.active = true;

exports.description =
  'removes non-inheritable group’s presentational attributes';

const {
  inheritableAttrs,
  attrsGroups,
  presentationNonInheritableGroupAttrs: applyGroups,
} = require('./_collections');

/**
 * Remove non-inheritable group's "presentation" attributes.
 *
 * @param {Object} item current iteration item
 * @return {Boolean} if false, item will be filtered out
 *
 * @author Kir Belevich
 */
exports.fn = function (item) {
  if (item.isElem('g')) {
    item.eachAttr((attr) => {
      if (
        attrsGroups.presentation.includes(attr.name) &&
        !inheritableAttrs.includes(attr.name) &&
        !applyGroups.includes(attr.name)
      ) {
        item.removeAttr(attr.name);
      }
    });
  }
};
