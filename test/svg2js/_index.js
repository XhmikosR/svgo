'use strict';

const { expect } = require('chai');

const FS = require('fs');
const PATH = require('path');
const JSAPI = require('../../lib/svgo/jsAPI');
const CSSClassList = require('../../lib/svgo/css-class-list');
const CSSStyleDeclaration = require('../../lib/svgo/css-style-declaration');
const SVG2JS = require('../../lib/svgo/svg2js');

describe('svg2js', () => {
  describe('working svg', () => {
    const filepath = PATH.resolve(__dirname, './test.svg');
    let root;

    before((done) => {
      FS.readFile(filepath, 'utf8', (err, data) => {
        if (err) {
          throw err;
        }

        root = SVG2JS(data);
        done();
      });
    });

    describe('root', () => {
      it('should exist', () => {
        expect(root).to.exist;
      });

      it('should be an instance of Object', () => {
        expect(root).to.be.an.instanceOf(Object);
      });

      it('should have property "children"', () => {
        expect(root).to.have.property('children');
      });
    });

    describe('root.children', () => {
      it('should be an instance of Array', () => {
        expect(root.children).to.be.an.instanceOf(Array);
      });

      it('should have length 4', () => {
        expect(root.children).to.have.lengthOf(4);
      });
    });

    it('the first node should be instruction', () => {
      expect(root.children[0]).to.include({
        type: 'instruction',
        name: 'xml',
        value: 'version="1.0" encoding="utf-8"',
      });
    });

    it('the second node should be comment', () => {
      expect(root.children[1]).to.include({
        type: 'comment',
        value:
          'Generator: Adobe Illustrator 15.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)',
      });
    });

    it('the third node should be doctype', () => {
      expect(root.children[2]).to.deep.include({
        type: 'doctype',
        name: 'svg',
        data: {
          doctype:
            ' svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"',
        },
      });
    });

    describe('name', () => {
      it('should have property name: "svg"', () => {
        expect(root.children[3]).to.include({
          name: 'svg',
        });
      });
    });

    describe('attributes', () => {
      describe('root.children[3].attrs', () => {
        it('should exist', () => {
          expect(root.children[3].attrs).to.exist;
        });

        it('should be an instance of Object', () => {
          expect(root.children[3].attrs).to.be.an.instanceOf(Object);
        });
      });

      describe('root.children[3].attrs.version', () => {
        it('should exist', () => {
          expect(root.children[3].attrs.version).to.exist;
        });

        it('should be an instance of Object', () => {
          expect(root.children[3].attrs.version).to.be.an.instanceOf(Object);
        });

        it('should have property name: "version"', () => {
          expect(root.children[3].attrs.version).to.have.property(
            'name',
            'version'
          );
        });

        it('should have property value: "1.1"', () => {
          expect(root.children[3].attrs.version).to.have.property(
            'value',
            '1.1'
          );
        });
      });
    });

    describe('children', () => {
      it('should exist', () => {
        expect(root.children[3].children).to.exist;
      });

      it('should be an instance of Array', () => {
        expect(root.children[3].children).to.be.an.instanceOf(Array);
      });

      it('should eventually have length 3', () => {
        expect(root.children[3].children).to.have.lengthOf(3);
      });
    });

    describe('text nodes', () => {
      it('should contain preserved whitespace', () => {
        const textNode = root.children[3].children[1].children[0].children[1];
        return expect(textNode.children[0].value).to.equal('  test  ');
      });
    });

    describe('API', () => {
      describe('clone()', () => {
        it('svg should have property "clone"', () => {
          expect(root.children[3]).to.have.property('clone');
        });

        it('svg.clone() should be an instance of JSAPI', () => {
          expect(root.children[3].clone()).to.be.instanceOf(JSAPI);
        });

        it('root.children[3].children[0].clone() has a valid style property', () => {
          expect(root.children[3].children[0].clone().style).to.be.instanceof(
            CSSStyleDeclaration
          );
        });

        it('root.children[3].children[2].clone() has a valid class property', () => {
          expect(root.children[3].children[2].clone().class).to.be.instanceof(
            CSSClassList
          );
        });
      });

      describe('isElem()', () => {
        it('svg should have property "isElem"', () => {
          expect(root.children[3]).to.have.property('isElem');
        });

        it('svg.isElem() should be true', () => {
          expect(root.children[3].isElem()).to.be.true;
        });

        it('svg.isElem("svg") should be true', () => {
          expect(root.children[3].isElem('svg')).to.be.true;
        });

        it('svg.isElem("trololo") should be false', () => {
          expect(root.children[3].isElem('trololo')).to.be.false;
        });

        it('svg.isElem(["svg", "trololo"]) should be true', () => {
          expect(root.children[3].isElem(['svg', 'trololo'])).to.be.true;
        });
      });

      describe('isEmpty()', () => {
        it('svg should have property "isEmpty"', () => {
          expect(root.children[3]).to.have.property('isEmpty');
        });

        it('svg.isEmpty() should be false', () => {
          expect(root.children[3].isEmpty()).to.be.false;
        });

        it('svg.children[0].children[0].isEmpty() should be true', () => {
          expect(root.children[3].children[0].children[0].isEmpty()).to.be.true;
        });
      });

      describe('hasAttr()', () => {
        it('svg should have property "hasAttr"', () => {
          expect(root.children[3]).to.have.property('hasAttr');
        });

        it('svg.hasAttr() should be true', () => {
          expect(root.children[3].hasAttr()).to.be.true;
        });

        it('svg.hasAttr("xmlns") should be true', () => {
          expect(root.children[3].hasAttr('xmlns')).to.be.true;
        });

        it('svg.hasAttr("xmlns", "http://www.w3.org/2000/svg") should be true', () => {
          expect(
            root.children[3].hasAttr('xmlns', 'http://www.w3.org/2000/svg')
          ).to.be.true;
        });

        it('svg.hasAttr("xmlns", "trololo") should be false', () => {
          expect(root.children[3].hasAttr('xmlns', 'trololo')).to.be.false;
        });

        it('svg.hasAttr("trololo") should be false', () => {
          expect(root.children[3].hasAttr('trololo')).to.be.false;
        });

        it('svg.children[1].hasAttr() should be false', () => {
          expect(root.children[3].children[1].hasAttr()).to.be.false;
        });
      });

      describe('attr()', () => {
        it('svg should have property "attr"', () => {
          expect(root.children[3]).to.have.property('attr');
        });

        it('svg.attr("xmlns") should be an instance of Object', () => {
          expect(root.children[3].attr('xmlns')).to.be.an.instanceOf(Object);
        });

        it('svg.attr("xmlns", "http://www.w3.org/2000/svg") should be an instance of Object', () => {
          expect(
            root.children[3].attr('xmlns', 'http://www.w3.org/2000/svg')
          ).to.be.an.instanceOf(Object);
        });

        it('svg.attr("xmlns", "trololo") should be an undefined', () => {
          expect(root.children[3].attr('xmlns', 'trololo')).to.not.exist;
        });

        it('svg.attr("trololo") should be an undefined', () => {
          expect(root.children[3].attr('trololo')).to.not.exist;
        });

        it('svg.attr() should be undefined', () => {
          expect(root.children[3].attr()).to.not.exist;
        });
      });

      describe('removeAttr()', () => {
        it('svg should have property "removeAttr"', () => {
          expect(root.children[3]).to.have.property('removeAttr');
        });

        it('svg.removeAttr("width") should be true', () => {
          expect(root.children[3].removeAttr('width')).to.be.true;

          expect(root.children[3].hasAttr('width')).to.be.false;
        });

        it('svg.removeAttr("height", "120px") should be true', () => {
          expect(root.children[3].removeAttr('height', '120px')).to.be.true;

          expect(root.children[3].hasAttr('height')).to.be.false;
        });

        it('svg.removeAttr("x", "1px") should be false', () => {
          expect(root.children[3].removeAttr('x', '1px')).to.be.false;

          expect(root.children[3].hasAttr('x')).to.be.true;
        });

        it('svg.removeAttr("z") should be false', () => {
          expect(root.children[3].removeAttr('z')).to.be.false;
        });

        it('svg.removeAttr() should be false', () => {
          expect(root.children[3].removeAttr()).to.be.false;
        });
      });

      describe('addAttr()', () => {
        const attr = {
          name: 'test',
          value: 3,
        };

        it('svg should have property "addAttr"', () => {
          expect(root.children[3]).to.have.property('addAttr');
        });

        it('svg.addAttr(attr) should be an instance of Object', () => {
          expect(root.children[3].addAttr(attr)).to.be.an.instanceOf(Object);
        });

        it('svg.children[1].children[0].addAttr(attr) should be an instance of Object', () => {
          expect(
            root.children[3].children[1].children[0].addAttr(attr)
          ).to.be.an.instanceOf(Object);
        });

        it('svg.addAttr() should be false', () => {
          expect(root.children[3].addAttr()).to.be.false;
        });
      });

      describe('eachAttr()', () => {
        it('svg should have property "eachAttr"', () => {
          expect(root.children[3]).to.have.property('eachAttr');
        });

        it('svg.children[0].eachAttr(function() {}) should be true', () => {
          expect(
            root.children[3].children[0].eachAttr((attr) => {
              attr.value = '1';
            })
          ).to.be.true;

          expect(root.children[3].children[0].attr('type').value).to.equal('1');
        });

        it('svg.children[1].eachAttr(function() {}) should be false', () => {
          expect(root.children[3].children[1].eachAttr()).to.be.false;
        });
      });
    });
  });

  describe('malformed svg', () => {
    const filepath = PATH.resolve(__dirname, './test.bad.svg');
    let root;
    let error;

    before((done) => {
      FS.readFile(filepath, 'utf8', (err, data) => {
        if (err) {
          throw err;
        }

        try {
          root = SVG2JS(data);
        } catch (error_) {
          error = error_;
        }

        done();
      });
    });

    describe('root', () => {
      it('should have property "error"', () => {
        expect(root).to.have.property('error');
      });
    });

    describe('root.error', () => {
      it('should be "Error in parsing SVG: Unexpected close tag"', () => {
        expect(root.error).to.equal(
          'Error in parsing SVG: Unexpected close tag\nLine: 10\nColumn: 15\nChar: >'
        );
      });
    });

    describe('error', () => {
      it('should not be thrown', () => {
        expect(error).to.not.exist;
      });
    });
  });
});
