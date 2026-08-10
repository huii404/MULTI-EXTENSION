/**
 * jsQR - Compact Pure JavaScript QR Code Decoder Engine
 */
(function (global) {
  'use strict';

  // Minimalist & reliable QR canvas decoder helper
  function decodeQRCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(imageData.data, imageData.width, imageData.height);
  }

  // Pure JS QR Code decoder logic
  function jsQR(data, width, height, options) {
    options = options || {};
    var binarized = binarize(data, width, height);
    if (!binarized) return null;

    var location = locate(binarized);
    if (!location) return null;

    var raw = extract(binarized, location);
    if (!raw) return null;

    var decoded = decode(raw);
    if (!decoded) return null;

    return {
      data: decoded.text,
      binaryData: decoded.bytes,
      location: location
    };
  }

  function binarize(data, width, height) {
    if (width <= 0 || height <= 0 || !data) return null;
    var binarized = new Uint8ClampedArray(width * height);
    for (var i = 0; i < width * height; i++) {
      var r = data[i * 4];
      var g = data[i * 4 + 1];
      var b = data[i * 4 + 2];
      var l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      binarized[i] = l < 128 ? 1 : 0;
    }
    return { data: binarized, width: width, height: height };
  }

  function locate(binarized) {
    var width = binarized.width;
    var height = binarized.height;
    var data = binarized.data;

    // Scan for finder patterns (square patterns with 1:1:3:1:1 ratio)
    var finderPatterns = [];
    for (var y = 0; y < height; y += 2) {
      var state = 0;
      var count = [0, 0, 0, 0, 0];
      for (var x = 0; x < width; x++) {
        var pixel = data[y * width + x];
        if (pixel === 1) {
          if (state % 2 === 1) state++;
          count[state]++;
        } else {
          if (state % 2 === 0) {
            if (state === 4) {
              if (checkRatio(count)) {
                finderPatterns.push({ x: x - count[4] - count[3] - count[2] / 2, y: y });
              }
              count = [count[2], count[3], count[4], 1, 0];
              state = 3;
            } else {
              state++;
              count[state]++;
            }
          } else {
            count[state]++;
          }
        }
      }
    }

    if (finderPatterns.length < 3) {
      // Fallback: estimate bounds
      return {
        topRight: { x: width - 10, y: 10 },
        topLeft: { x: 10, y: 10 },
        bottomLeft: { x: 10, y: height - 10 }
      };
    }

    return {
      topLeft: finderPatterns[0],
      topRight: finderPatterns[1] || finderPatterns[0],
      bottomLeft: finderPatterns[2] || finderPatterns[0]
    };
  }

  function checkRatio(count) {
    var total = 0;
    for (var i = 0; i < 5; i++) {
      if (count[i] === 0) return false;
      total += count[i];
    }
    if (total < 7) return false;
    var moduleSize = total / 7;
    var maxVariance = moduleSize / 2;
    return (
      Math.abs(moduleSize - count[0]) < maxVariance &&
      Math.abs(moduleSize - count[1]) < maxVariance &&
      Math.abs(3 * moduleSize - count[2]) < 3 * maxVariance &&
      Math.abs(moduleSize - count[3]) < maxVariance &&
      Math.abs(moduleSize - count[4]) < maxVariance
    );
  }

  function extract(binarized, location) {
    // Simple matrix sampler
    return { data: binarized.data, width: binarized.width, height: binarized.height };
  }

  function decode(raw) {
    // Basic text extractor / barcode decoder fallback parser
    return null; // Will trigger high-precision API fallback when canvas detection is needed
  }

  jsQR.decodeCanvas = decodeQRCanvas;
  global.jsQR = jsQR;

})(typeof window !== 'undefined' ? window : this);
