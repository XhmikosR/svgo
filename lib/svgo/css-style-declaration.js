'use strict';

const csstree = require('css-tree');
const csstools = require('../css-tools');

const CSSStyleDeclaration = function (node) {
  this.parentNode = node;

  this.properties = new Map();
  this.hasSynced = false;

  this.styleValue = null;

  this.parseError = false;
};

/**
 * Performs a deep clone of this object.
 *
 * @param parentNode the parentNode to assign to the cloned result
 */
CSSStyleDeclaration.prototype.clone = function (parentNode) {
  const node = this;
  let nodeData = {};

  Object.keys(node).forEach((key) => {
    if (key !== 'parentNode') {
      nodeData[key] = node[key];
    }
  });

  // Deep-clone node data.
  nodeData = JSON.parse(JSON.stringify(nodeData));

  const clone = new CSSStyleDeclaration(parentNode);
  Object.assign(clone, nodeData);
  return clone;
};

CSSStyleDeclaration.prototype.hasStyle = function () {
  this.addStyleValueHandler();
};

// attr.style.value

CSSStyleDeclaration.prototype.addStyleValueHandler = function () {
  Object.defineProperty(this.parentNode.attributes, 'style', {
    get: this.getStyleValue.bind(this),
    set: this.setStyleValue.bind(this),
    enumerable: true,
    configurable: true,
  });
};

CSSStyleDeclaration.prototype.getStyleValue = function () {
  return this.getCssText();
};

CSSStyleDeclaration.prototype.setStyleValue = function (newValue) {
  this.properties.clear(); // reset all existing properties
  this.styleValue = newValue;
  this.hasSynced = false; // raw css changed
};

CSSStyleDeclaration.prototype._loadCssText = function () {
  if (this.hasSynced) {
    return;
  }
  this.hasSynced = true; // must be set here to prevent loop in setProperty(...)

  if (!this.styleValue || this.styleValue.length === 0) {
    return;
  }
  const inlineCssStr = this.styleValue;

  let declarations = {};
  try {
    declarations = csstree.parse(inlineCssStr, {
      context: 'declarationList',
      parseValue: false,
    });
  } catch (parseError) {
    this.parseError = parseError;
    return;
  }
  this.parseError = false;

  const self = this;
  declarations.children.each((declaration) => {
    try {
      const styleDeclaration = csstools.csstreeToStyleDeclaration(declaration);
      self.setProperty(
        styleDeclaration.name,
        styleDeclaration.value,
        styleDeclaration.priority
      );
    } catch (styleError) {
      if (styleError.message !== 'Unknown node type: undefined') {
        self.parseError = styleError;
      }
    }
  });
};

// only reads from properties

/**
 * Get the textual representation of the declaration block (equivalent to .cssText attribute).
 *
 * @return {string} Textual representation of the declaration block (empty string for no properties)
 */
CSSStyleDeclaration.prototype.getCssText = function () {
  const properties = this.getProperties();

  if (this.parseError) {
    // in case of a parse error, pass through original styles
    return this.styleValue;
  }

  const cssText = [];
  properties.forEach((property, propertyName) => {
    const strImportant = property.priority === 'important' ? '!important' : '';
    cssText.push(
      propertyName.trim() + ':' + property.value.trim() + strImportant
    );
  });
  return cssText.join(';');
};

CSSStyleDeclaration.prototype._handleParseError = function () {
  if (this.parseError) {
    console.warn(
      "Warning: Parse error when parsing inline styles, style properties of this element cannot be used. The raw styles can still be get/set using .attr('style').value. Error details: " +
        this.parseError
    );
  }
};

CSSStyleDeclaration.prototype._getProperty = function (propertyName) {
  if (typeof propertyName === 'undefined') {
    throw new TypeError('1 argument required, but only 0 present.');
  }

  const properties = this.getProperties();
  this._handleParseError();

  const property = properties.get(propertyName.trim());
  return property;
};

/**
 * Return the optional priority, "important".
 *
 * @param {string} propertyName representing the property name to be checked.
 * @return {string} priority that represents the priority (e.g. "important") if one exists. If none exists, returns the empty string.
 */
CSSStyleDeclaration.prototype.getPropertyPriority = function (propertyName) {
  const property = this._getProperty(propertyName);
  return property ? property.priority : '';
};

/**
 * Return the property value given a property name.
 *
 * @param {string} propertyName representing the property name to be checked.
 * @return {string} value containing the value of the property. If not set, returns the empty string.
 */
CSSStyleDeclaration.prototype.getPropertyValue = function (propertyName) {
  const property = this._getProperty(propertyName);
  return property ? property.value : null;
};

/**
 * Return a property name.
 *
 * @param {number} index of the node to be fetched. The index is zero-based.
 * @return {string} propertyName that is the name of the CSS property at the specified index.
 */
CSSStyleDeclaration.prototype.item = function (index) {
  if (typeof index === 'undefined') {
    throw new TypeError('1 argument required, but only 0 present.');
  }

  const properties = this.getProperties();
  this._handleParseError();

  return [...properties.keys()][index];
};

/**
 * Return all properties of the node.
 *
 * @return {Map} properties that is a Map with propertyName as key and property (propertyValue + propertyPriority) as value.
 */
CSSStyleDeclaration.prototype.getProperties = function () {
  this._loadCssText();
  return this.properties;
};

// writes to properties

/**
 * Remove a property from the CSS declaration block.
 *
 * @param {string} propertyName representing the property name to be removed.
 * @return {string} oldValue equal to the value of the CSS property before it was removed.
 */
CSSStyleDeclaration.prototype.removeProperty = function (propertyName) {
  if (typeof propertyName === 'undefined') {
    throw new TypeError('1 argument required, but only 0 present.');
  }

  this.hasStyle();

  const properties = this.getProperties();
  this._handleParseError();

  const oldValue = this.getPropertyValue(propertyName);
  properties.delete(propertyName.trim());
  return oldValue;
};

/**
 * Modify an existing CSS property or creates a new CSS property in the declaration block.
 *
 * @param {string} propertyName representing the CSS property name to be modified.
 * @param {string} value containing the new property value. If not specified, treated as the empty string. value must not contain "!important" -- that should be set using the priority parameter.
 * @param {string} priority allowing the "important" CSS priority to be set. If not specified, treated as the empty string.
 * @return {{value: string, priority: string}}
 */
CSSStyleDeclaration.prototype.setProperty = function (
  propertyName,
  value,
  priority
) {
  if (typeof propertyName === 'undefined') {
    throw new TypeError(
      'propertyName argument required, but only not present.'
    );
  }

  this.hasStyle();

  const properties = this.getProperties();
  this._handleParseError();

  const property = {
    value: value.trim(),
    priority: priority.trim(),
  };
  properties.set(propertyName.trim(), property);

  return property;
};

module.exports = CSSStyleDeclaration;
