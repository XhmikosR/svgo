'use strict';

const { expect } = require('chai');
const FS = require('fs');
const PATH = require('path');
const { EOL } = require('os');
const regEOL = new RegExp(EOL, 'g');
const regFilename = /^(.*)\.(\d+)\.svg$/;
const { optimize } = require('../../lib/svgo.js');

describe('plugins tests', () => {
  FS.readdirSync(__dirname).forEach((file) => {
    const match = file.match(regFilename);
    let index;
    let name;

    if (match) {
      name = match[1];
      index = match[2];

      file = PATH.resolve(__dirname, file);

      it(name + '.' + index, () => {
        return readFile(file).then((data) => {
          // remove description
          const items = normalize(data).split(/\s*===\s*/);
          const test = items.length === 2 ? items[1] : items[0];
          // extract test case
          const [original, should, params] = test.split(/\s*@@@\s*/);
          const plugin = {
            name,
            params: params ? JSON.parse(params) : {},
          };
          const result = optimize(original, {
            path: file,
            plugins: [plugin],
            js2svg: { pretty: true },
          });
          if (result.error != null) {
            expect.fail(result.error);
          }

          //FIXME: results.data has a '\n' at the end while it should not
          expect(normalize(result.data)).to.equal(should);
        });
      });
    }
  });
});

function normalize(file) {
  return file.trim().replace(regEOL, '\n');
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    FS.readFile(file, 'utf8', (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}
