'use strict';

const { expect } = require('chai');
const { createContentItem } = require('../../lib/svgo.js');
const JSAPI = require('../../lib/svgo/jsAPI.js');

describe('svgo api', () => {
  it('should has createContentItem method', () => {
    expect(createContentItem).to.be.instanceOf(Function);
  });

  it('should be able to create content item', () => {
    const item = createContentItem({
      elem: 'elementName',
    });
    expect(item).to.be.instanceOf(JSAPI);
    expect(item).to.have.ownProperty('elem').equal('elementName');
  });

  it('should be able create content item without argument', () => {
    const item = createContentItem();
    expect(item).to.be.instanceOf(JSAPI);
    expect(item).to.be.empty;
  });
});
