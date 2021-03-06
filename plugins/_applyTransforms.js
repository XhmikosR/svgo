'use strict';

// TODO implement as separate plugin

const {
  transformsMultiply,
  transform2js,
  transformArc,
} = require('./_transforms.js');
const { removeLeadingZero } = require('../lib/svgo/tools.js');
const { referencesProps, attrsGroupsDefaults } = require('./_collections.js');

const regNumericValues = /[-+]?(\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
const defaultStrokeWidth = attrsGroupsDefaults.presentation['stroke-width'];

/**
 * Apply transformation(s) to the Path data.
 *
 * @param {Object} elem current element
 * @param {Array} path input path data
 * @param {Object} params whether to apply transforms to stroked lines and transform precision (used for stroke width)
 * @return {Array} output path data
 */
const applyTransforms = (elem, pathData, params) => {
  // if there are no 'stroke' attr and references to other objects such as
  // gradiends or clip-path which are also subjects to transform.
  if (
    !elem.hasAttr('transform') ||
    !elem.attr('transform').value ||
    // styles are not considered when applying transform
    // can be fixed properly with new style engine
    elem.hasAttr('style') ||
    elem.someAttr(
      (attr) =>
        referencesProps.includes(attr.name) && attr.value.includes('url(')
    )
  ) {
    return;
  }

  const matrix = transformsMultiply(transform2js(elem.attr('transform').value));
  const stroke = elem.computedAttr('stroke');
  const id = elem.computedAttr('id');
  const transformPrecision = params.transformPrecision;

  if (stroke && stroke != 'none') {
    if (
      !params.applyTransformsStroked ||
      ((matrix.data[0] != matrix.data[3] ||
        matrix.data[1] != -matrix.data[2]) &&
        (matrix.data[0] != -matrix.data[3] || matrix.data[1] != matrix.data[2]))
    )
      return;

    // "stroke-width" should be inside the part with ID, otherwise it can be overrided in <use>
    if (id) {
      let idElem = elem;
      let hasStrokeWidth = false;

      do {
        if (idElem.hasAttr('stroke-width')) hasStrokeWidth = true;
      } while (
        !idElem.hasAttr('id', id) &&
        !hasStrokeWidth &&
        (idElem = idElem.parentNode)
      );

      if (!hasStrokeWidth) return;
    }

    const scale = +Math.sqrt(
      matrix.data[0] * matrix.data[0] + matrix.data[1] * matrix.data[1]
    ).toFixed(transformPrecision);

    if (scale !== 1) {
      const strokeWidth =
        elem.computedAttr('stroke-width') || defaultStrokeWidth;

      if (
        !elem.hasAttr('vector-effect') ||
        elem.attr('vector-effect').value !== 'non-scaling-stroke'
      ) {
        if (elem.hasAttr('stroke-width')) {
          elem.attrs['stroke-width'].value = elem.attrs['stroke-width'].value
            .trim()
            .replace(regNumericValues, (num) => removeLeadingZero(num * scale));
        } else {
          elem.addAttr({
            name: 'stroke-width',
            value: strokeWidth.replace(regNumericValues, (num) =>
              removeLeadingZero(num * scale)
            ),
          });
        }

        if (elem.hasAttr('stroke-dashoffset')) {
          elem.attrs['stroke-dashoffset'].value = elem.attrs[
            'stroke-dashoffset'
          ].value
            .trim()
            .replace(regNumericValues, (num) => removeLeadingZero(num * scale));
        }

        if (elem.hasAttr('stroke-dasharray')) {
          elem.attrs['stroke-dasharray'].value = elem.attrs[
            'stroke-dasharray'
          ].value
            .trim()
            .replace(regNumericValues, (num) => removeLeadingZero(num * scale));
        }
      }
    }
  } else if (id) {
    // Stroke and stroke-width can be redefined with <use>
    return;
  }

  applyMatrixToPathData(pathData, matrix.data);

  // remove transform attr
  elem.removeAttr('transform');

  return;
};
exports.applyTransforms = applyTransforms;

const transformAbsolutePoint = (matrix, x, y) => {
  const newX = matrix[0] * x + matrix[2] * y + matrix[4];
  const newY = matrix[1] * x + matrix[3] * y + matrix[5];
  return [newX, newY];
};

const transformRelativePoint = (matrix, x, y) => {
  const newX = matrix[0] * x + matrix[2] * y;
  const newY = matrix[1] * x + matrix[3] * y;
  return [newX, newY];
};

const applyMatrixToPathData = (pathData, matrix) => {
  let start = [0, 0];
  let cursor = [0, 0];

  for (const pathItem of pathData) {
    let { instruction: command, data: args } = pathItem;
    // moveto (x y)
    if (command === 'M') {
      cursor[0] = args[0];
      cursor[1] = args[1];
      start[0] = cursor[0];
      start[1] = cursor[1];
      const [x, y] = transformAbsolutePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }
    if (command === 'm') {
      cursor[0] += args[0];
      cursor[1] += args[1];
      start[0] = cursor[0];
      start[1] = cursor[1];
      const [x, y] = transformRelativePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }

    // horizontal lineto (x)
    // convert to lineto to handle two-dimentional transforms
    if (command === 'H') {
      command = 'L';
      args = [args[0], cursor[1]];
    }
    if (command === 'h') {
      command = 'l';
      args = [args[0], 0];
    }

    // vertical lineto (y)
    // convert to lineto to handle two-dimentional transforms
    if (command === 'V') {
      command = 'L';
      args = [cursor[0], args[0]];
    }
    if (command === 'v') {
      command = 'l';
      args = [0, args[0]];
    }

    // lineto (x y)
    if (command === 'L') {
      cursor[0] = args[0];
      cursor[1] = args[1];
      const [x, y] = transformAbsolutePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }
    if (command === 'l') {
      cursor[0] += args[0];
      cursor[1] += args[1];
      const [x, y] = transformRelativePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }

    // curveto (x1 y1 x2 y2 x y)
    if (command === 'C') {
      cursor[0] = args[4];
      cursor[1] = args[5];
      const [x1, y1] = transformAbsolutePoint(matrix, args[0], args[1]);
      const [x2, y2] = transformAbsolutePoint(matrix, args[2], args[3]);
      const [x, y] = transformAbsolutePoint(matrix, args[4], args[5]);
      args[0] = x1;
      args[1] = y1;
      args[2] = x2;
      args[3] = y2;
      args[4] = x;
      args[5] = y;
    }
    if (command === 'c') {
      cursor[0] += args[4];
      cursor[1] += args[5];
      const [x1, y1] = transformRelativePoint(matrix, args[0], args[1]);
      const [x2, y2] = transformRelativePoint(matrix, args[2], args[3]);
      const [x, y] = transformRelativePoint(matrix, args[4], args[5]);
      args[0] = x1;
      args[1] = y1;
      args[2] = x2;
      args[3] = y2;
      args[4] = x;
      args[5] = y;
    }

    // smooth curveto (x2 y2 x y)
    if (command === 'S') {
      cursor[0] = args[2];
      cursor[1] = args[3];
      const [x2, y2] = transformAbsolutePoint(matrix, args[0], args[1]);
      const [x, y] = transformAbsolutePoint(matrix, args[2], args[3]);
      args[0] = x2;
      args[1] = y2;
      args[2] = x;
      args[3] = y;
    }
    if (command === 's') {
      cursor[0] += args[2];
      cursor[1] += args[3];
      const [x2, y2] = transformRelativePoint(matrix, args[0], args[1]);
      const [x, y] = transformRelativePoint(matrix, args[2], args[3]);
      args[0] = x2;
      args[1] = y2;
      args[2] = x;
      args[3] = y;
    }

    // quadratic Bézier curveto (x1 y1 x y)
    if (command === 'Q') {
      cursor[0] = args[2];
      cursor[1] = args[3];
      const [x1, y1] = transformAbsolutePoint(matrix, args[0], args[1]);
      const [x, y] = transformAbsolutePoint(matrix, args[2], args[3]);
      args[0] = x1;
      args[1] = y1;
      args[2] = x;
      args[3] = y;
    }
    if (command === 'q') {
      cursor[0] += args[2];
      cursor[1] += args[3];
      const [x1, y1] = transformRelativePoint(matrix, args[0], args[1]);
      const [x, y] = transformRelativePoint(matrix, args[2], args[3]);
      args[0] = x1;
      args[1] = y1;
      args[2] = x;
      args[3] = y;
    }

    // smooth quadratic Bézier curveto (x y)
    if (command === 'T') {
      cursor[0] = args[0];
      cursor[1] = args[1];
      const [x, y] = transformAbsolutePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }
    if (command === 't') {
      cursor[0] += args[0];
      cursor[1] += args[1];
      const [x, y] = transformRelativePoint(matrix, args[0], args[1]);
      args[0] = x;
      args[1] = y;
    }

    // elliptical arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
    if (command === 'A') {
      transformArc(cursor, args, matrix);
      cursor[0] = args[5];
      cursor[1] = args[6];
      // reduce number of digits in rotation angle
      if (Math.abs(args[2]) > 80) {
        const a = args[0];
        const rotation = args[2];
        args[0] = args[1];
        args[1] = a;
        args[2] = rotation + (rotation > 0 ? -90 : 90);
      }
      const [x, y] = transformAbsolutePoint(matrix, args[5], args[6]);
      args[5] = x;
      args[6] = y;
    }
    if (command === 'a') {
      transformArc([0, 0], args, matrix);
      cursor[0] += args[5];
      cursor[1] += args[6];
      // reduce number of digits in rotation angle
      if (Math.abs(args[2]) > 80) {
        const a = args[0];
        const rotation = args[2];
        args[0] = args[1];
        args[1] = a;
        args[2] = rotation + (rotation > 0 ? -90 : 90);
      }
      const [x, y] = transformRelativePoint(matrix, args[5], args[6]);
      args[5] = x;
      args[6] = y;
    }

    pathItem.instruction = command;
    pathItem.data = args;
  }
};
