(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.zenmill = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
'use strict';

var path = require('path');
var Job = require('./job');

/**
 * Creates templates compiler.
 *
 * @param {function} load: function(path) => Promise<Content>
 *     - a function that loads template content asynchronously,
 *       used for resolving initial template and all its includes
 * @param {*} options
 * @param {boolean} options.stripComments - remove comments at compile time
 */
module.exports = function createCompiler(load, options) {
    options = options || {};
    var stripComments = !!options.stripComments;

    function compile(file) {
        file = path.normalize(file);
        var job = new Job({
            file: file,
            load: load,
            stripComments: stripComments
        });
        return job.compile();
    }

    function render(file, data) {
        return compile(file).then(function (fn) {
            return fn(data);
        });
    }

    return {
        compile: compile,
        render: render
    };
};

},{"./job":6,"path":1}],4:[function(require,module,exports){
"use strict";

module.exports = function () {
  "use strict";

  /*
   * Generated by PEG.js 0.9.0.
   *
   * http://pegjs.org/
   */

  function peg$subclass(child, parent) {
    function ctor() {
      this.constructor = child;
    }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message = message;
    this.expected = expected;
    this.found = found;
    this.location = location;
    this.name = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser = this,
        peg$FAILED = {},
        peg$startRuleFunctions = { Nodes: peg$parseNodes },
        peg$startRuleFunction = peg$parseNodes,
        peg$c0 = { type: "other", description: "include" },
        peg$c1 = "/>",
        peg$c2 = { type: "literal", value: "/>", description: "\"/>\"" },
        peg$c3 = function peg$c3(tag) {
      return {
        type: 'include',
        file: tag.file,
        nodes: []
      };
    },
        peg$c4 = ">",
        peg$c5 = { type: "literal", value: ">", description: "\">\"" },
        peg$c6 = "</include>",
        peg$c7 = { type: "literal", value: "</include>", description: "\"</include>\"" },
        peg$c8 = function peg$c8(tag, nodes) {
      return {
        type: 'include',
        file: tag.file,
        nodes: nodes
      };
    },
        peg$c9 = "<include",
        peg$c10 = { type: "literal", value: "<include", description: "\"<include\"" },
        peg$c11 = "file",
        peg$c12 = { type: "literal", value: "file", description: "\"file\"" },
        peg$c13 = "=",
        peg$c14 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c15 = function peg$c15(file) {
      return {
        file: file
      };
    },
        peg$c16 = function peg$c16(node) {
      return node;
    },
        peg$c17 = { type: "other", description: "inline" },
        peg$c18 = "<inline",
        peg$c19 = { type: "literal", value: "<inline", description: "\"<inline\"" },
        peg$c20 = function peg$c20(file) {
      return {
        type: 'inline',
        file: file
      };
    },
        peg$c21 = { type: "other", description: "definition" },
        peg$c22 = "<",
        peg$c23 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c24 = ":",
        peg$c25 = { type: "literal", value: ":", description: "\":\"" },
        peg$c26 = "</",
        peg$c27 = { type: "literal", value: "</", description: "\"</\"" },
        peg$c28 = function peg$c28(def, name, nodes, _def) {
      return def == _def;
    },
        peg$c29 = function peg$c29(def, name, nodes, _def, _name) {
      return name == _name;
    },
        peg$c30 = function peg$c30(def, name, nodes, _def, _name) {
      return {
        type: 'def',
        mode: def,
        name: name,
        nodes: nodes
      };
    },
        peg$c31 = "def",
        peg$c32 = { type: "literal", value: "def", description: "\"def\"" },
        peg$c33 = "append",
        peg$c34 = { type: "literal", value: "append", description: "\"append\"" },
        peg$c35 = "prepend",
        peg$c36 = { type: "literal", value: "prepend", description: "\"prepend\"" },
        peg$c37 = { type: "other", description: "block" },
        peg$c38 = "<block:",
        peg$c39 = { type: "literal", value: "<block:", description: "\"<block:\"" },
        peg$c40 = function peg$c40(name) {
      return {
        type: 'block',
        name: name,
        nodes: []
      };
    },
        peg$c41 = "</block:",
        peg$c42 = { type: "literal", value: "</block:", description: "\"</block:\"" },
        peg$c43 = function peg$c43(name, nodes, _name) {
      return name == _name;
    },
        peg$c44 = function peg$c44(name, nodes, _name) {
      return {
        type: 'block',
        name: name,
        nodes: nodes
      };
    },
        peg$c45 = { type: "other", description: "comment" },
        peg$c46 = "<!--",
        peg$c47 = { type: "literal", value: "<!--", description: "\"<!--\"" },
        peg$c48 = "-->",
        peg$c49 = { type: "literal", value: "-->", description: "\"-->\"" },
        peg$c50 = function peg$c50(content) {
      return {
        type: 'comment',
        content: content
      };
    },
        peg$c51 = { type: "any", description: "any character" },
        peg$c52 = { type: "other", description: "var" },
        peg$c53 = "<var:",
        peg$c54 = { type: "literal", value: "<var:", description: "\"<var:\"" },
        peg$c55 = "</var:",
        peg$c56 = { type: "literal", value: "</var:", description: "\"</var:\"" },
        peg$c57 = function peg$c57(name, expr, _name) {
      return name == _name;
    },
        peg$c58 = function peg$c58(name, expr, _name) {
      return {
        type: 'var',
        name: name,
        expr: expr
      };
    },
        peg$c59 = { type: "other", description: "expression" },
        peg$c60 = "#{",
        peg$c61 = { type: "literal", value: "#{", description: "\"#{\"" },
        peg$c62 = "}",
        peg$c63 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c64 = function peg$c64(expr) {
      return {
        type: 'expr',
        escape: true,
        expr: expr
      };
    },
        peg$c65 = "!{",
        peg$c66 = { type: "literal", value: "!{", description: "\"!{\"" },
        peg$c67 = function peg$c67(expr) {
      return {
        type: 'expr',
        escape: false,
        expr: expr
      };
    },
        peg$c68 = /^[^}{"'<]/,
        peg$c69 = { type: "class", value: "[^}{\"'<]", description: "[^}{\"'<]" },
        peg$c70 = "{",
        peg$c71 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c72 = { type: "other", description: "if" },
        peg$c73 = "<if",
        peg$c74 = { type: "literal", value: "<if", description: "\"<if\"" },
        peg$c75 = "expr",
        peg$c76 = { type: "literal", value: "expr", description: "\"expr\"" },
        peg$c77 = "</if>",
        peg$c78 = { type: "literal", value: "</if>", description: "\"</if>\"" },
        peg$c79 = function peg$c79(expr, nodes) {
      return {
        type: 'if',
        when: [{
          type: 'when',
          expr: expr,
          nodes: nodes
        }]
      };
    },
        peg$c80 = "<if>",
        peg$c81 = { type: "literal", value: "<if>", description: "\"<if>\"" },
        peg$c82 = function peg$c82(when, otherwise) {
      return {
        type: 'if',
        when: when,
        otherwise: otherwise
      };
    },
        peg$c83 = { type: "other", description: "when" },
        peg$c84 = "<when",
        peg$c85 = { type: "literal", value: "<when", description: "\"<when\"" },
        peg$c86 = "</when>",
        peg$c87 = { type: "literal", value: "</when>", description: "\"</when>\"" },
        peg$c88 = function peg$c88(expr, nodes) {
      return {
        type: 'when',
        expr: expr,
        nodes: nodes
      };
    },
        peg$c89 = { type: "other", description: "otherwise" },
        peg$c90 = "<otherwise>",
        peg$c91 = { type: "literal", value: "<otherwise>", description: "\"<otherwise>\"" },
        peg$c92 = "</otherwise>",
        peg$c93 = { type: "literal", value: "</otherwise>", description: "\"</otherwise>\"" },
        peg$c94 = function peg$c94(nodes) {
      return {
        type: 'otherwise',
        nodes: nodes
      };
    },
        peg$c95 = { type: "other", description: "each" },
        peg$c96 = "<each:",
        peg$c97 = { type: "literal", value: "<each:", description: "\"<each:\"" },
        peg$c98 = "in",
        peg$c99 = { type: "literal", value: "in", description: "\"in\"" },
        peg$c100 = "</each:",
        peg$c101 = { type: "literal", value: "</each:", description: "\"</each:\"" },
        peg$c102 = function peg$c102(name, expr, nodes, _name) {
      return name == _name;
    },
        peg$c103 = function peg$c103(name, expr, nodes, _name) {
      return {
        type: 'each',
        name: name,
        expr: expr,
        nodes: nodes
      };
    },
        peg$c104 = "include",
        peg$c105 = { type: "literal", value: "include", description: "\"include\"" },
        peg$c106 = "inline",
        peg$c107 = { type: "literal", value: "inline", description: "\"inline\"" },
        peg$c108 = "block:",
        peg$c109 = { type: "literal", value: "block:", description: "\"block:\"" },
        peg$c110 = "def:",
        peg$c111 = { type: "literal", value: "def:", description: "\"def:\"" },
        peg$c112 = "append:",
        peg$c113 = { type: "literal", value: "append:", description: "\"append:\"" },
        peg$c114 = "prepend:",
        peg$c115 = { type: "literal", value: "prepend:", description: "\"prepend:\"" },
        peg$c116 = "if",
        peg$c117 = { type: "literal", value: "if", description: "\"if\"" },
        peg$c118 = "when",
        peg$c119 = { type: "literal", value: "when", description: "\"when\"" },
        peg$c120 = "otherwise",
        peg$c121 = { type: "literal", value: "otherwise", description: "\"otherwise\"" },
        peg$c122 = "each:",
        peg$c123 = { type: "literal", value: "each:", description: "\"each:\"" },
        peg$c124 = "var:",
        peg$c125 = { type: "literal", value: "var:", description: "\"var:\"" },
        peg$c126 = { type: "other", description: "plain text" },
        peg$c127 = /^[^<#!$]/,
        peg$c128 = { type: "class", value: "[^<#!$]", description: "[^<#!$]" },
        peg$c129 = "/",
        peg$c130 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c131 = "!--",
        peg$c132 = { type: "literal", value: "!--", description: "\"!--\"" },
        peg$c133 = /^[#!$]/,
        peg$c134 = { type: "class", value: "[#!$]", description: "[#!$]" },
        peg$c135 = { type: "other", description: "variable name" },
        peg$c136 = /^[a-z]/,
        peg$c137 = { type: "class", value: "[a-z]", description: "[a-z]" },
        peg$c138 = /^[a-zA-Z0-9_]/,
        peg$c139 = { type: "class", value: "[a-zA-Z0-9_]", description: "[a-zA-Z0-9_]" },
        peg$c140 = { type: "other", description: "attribute value" },
        peg$c141 = { type: "other", description: "string" },
        peg$c142 = "'",
        peg$c143 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c144 = /^[^']/,
        peg$c145 = { type: "class", value: "[^']", description: "[^']" },
        peg$c146 = function peg$c146(chars) {
      return chars;
    },
        peg$c147 = "\"",
        peg$c148 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c149 = /^[^"]/,
        peg$c150 = { type: "class", value: "[^\"]", description: "[^\"]" },
        peg$c151 = "\\",
        peg$c152 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c153 = /^[^\n\r\u2028\u2029]/,
        peg$c154 = { type: "class", value: "[^\\n\\r\\u2028\\u2029]", description: "[^\\n\\r\\u2028\\u2029]" },
        peg$c155 = { type: "other", description: "whitespace" },
        peg$c156 = /^[ \t\n\r]/,
        peg$c157 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$currPos = 0,
        peg$savedPos = 0,
        peg$posDetailsCache = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos = 0,
        peg$maxFailExpected = [],
        peg$silentFails = 0,
        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$savedPos, peg$currPos);
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function expected(description) {
      throw peg$buildException(null, [{ type: "other", description: description }], input.substring(peg$savedPos, peg$currPos), peg$computeLocation(peg$savedPos, peg$currPos));
    }

    function error(message) {
      throw peg$buildException(message, null, input.substring(peg$savedPos, peg$currPos), peg$computeLocation(peg$savedPos, peg$currPos));
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p,
          ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line: details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) {
              details.line++;
            }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line: startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line: endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) {
        return;
      }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function (a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) {
            return ch.charCodeAt(0).toString(16).toUpperCase();
          }

          return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\x08/g, '\\b').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\f/g, '\\f').replace(/\r/g, '\\r').replace(/[\x00-\x07\x0B\x0E\x0F]/g, function (ch) {
            return '\\x0' + hex(ch);
          }).replace(/[\x10-\x1F\x80-\xFF]/g, function (ch) {
            return '\\x' + hex(ch);
          }).replace(/[\u0100-\u0FFF]/g, function (ch) {
            return "\\u0" + hex(ch);
          }).replace(/[\u1000-\uFFFF]/g, function (ch) {
            return "\\u" + hex(ch);
          });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc,
            foundDesc,
            i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1 ? expectedDescs.slice(0, -1).join(", ") + " or " + expectedDescs[expected.length - 1] : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(message !== null ? message : buildMessage(expected, found), expected, found, location);
    }

    function peg$parseNodes() {
      var s0, s1;

      s0 = [];
      s1 = peg$parseNode();
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parseNode();
      }

      return s0;
    }

    function peg$parseNode() {
      var s0;

      s0 = peg$parseZenNode();
      if (s0 === peg$FAILED) {
        s0 = peg$parsePlain();
      }

      return s0;
    }

    function peg$parseZenNode() {
      var s0;

      s0 = peg$parseInclude();
      if (s0 === peg$FAILED) {
        s0 = peg$parseInline();
        if (s0 === peg$FAILED) {
          s0 = peg$parseBlock();
          if (s0 === peg$FAILED) {
            s0 = peg$parseComment();
            if (s0 === peg$FAILED) {
              s0 = peg$parseVar();
              if (s0 === peg$FAILED) {
                s0 = peg$parseFlowControl();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseExpression();
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseInclude() {
      var s0, s1;

      peg$silentFails++;
      s0 = peg$parseIncludeSelfClosing();
      if (s0 === peg$FAILED) {
        s0 = peg$parseIncludeWithDefs();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c0);
        }
      }

      return s0;
    }

    function peg$parseIncludeSelfClosing() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseIncludeTagStart();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c1) {
          s2 = peg$c1;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c2);
          }
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c3(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseIncludeWithDefs() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseIncludeTagStart();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 62) {
          s2 = peg$c4;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c5);
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsews();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsews();
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseIncludeNodes();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 10) === peg$c6) {
                s5 = peg$c6;
                peg$currPos += 10;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$c7);
                }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c8(s1, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseIncludeTagStart() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 8) === peg$c9) {
        s1 = peg$c9;
        peg$currPos += 8;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c10);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsews();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c11) {
            s3 = peg$c11;
            peg$currPos += 4;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c12);
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsews();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parsews();
            }
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s5 = peg$c13;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$c14);
                }
              }
              if (s5 !== peg$FAILED) {
                s6 = [];
                s7 = peg$parsews();
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$parsews();
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseAttrValue();
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    s9 = peg$parsews();
                    while (s9 !== peg$FAILED) {
                      s8.push(s9);
                      s9 = peg$parsews();
                    }
                    if (s8 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c15(s7);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseIncludeNodes() {
      var s0, s1;

      s0 = [];
      s1 = peg$parseIncludeNode();
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parseIncludeNode();
      }

      return s0;
    }

    function peg$parseIncludeNode() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseDef();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsews();
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c16(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseVar();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parsews();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsews();
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c16(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }

      return s0;
    }

    function peg$parseInline() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c18) {
        s1 = peg$c18;
        peg$currPos += 7;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c19);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsews();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c11) {
            s3 = peg$c11;
            peg$currPos += 4;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c12);
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsews();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parsews();
            }
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s5 = peg$c13;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$c14);
                }
              }
              if (s5 !== peg$FAILED) {
                s6 = [];
                s7 = peg$parsews();
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$parsews();
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseAttrValue();
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    s9 = peg$parsews();
                    while (s9 !== peg$FAILED) {
                      s8.push(s9);
                      s9 = peg$parsews();
                    }
                    if (s8 !== peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c1) {
                        s9 = peg$c1;
                        peg$currPos += 2;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$c2);
                        }
                      }
                      if (s9 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c20(s7);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c17);
        }
      }

      return s0;
    }

    function peg$parseDef() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 60) {
        s1 = peg$c22;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c23);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseDefTag();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c24;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c25);
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseVarName();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parsews();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parsews();
              }
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 62) {
                  s6 = peg$c4;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$c5);
                  }
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseNodes();
                  if (s7 !== peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c26) {
                      s8 = peg$c26;
                      peg$currPos += 2;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$c27);
                      }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseDefTag();
                      if (s9 !== peg$FAILED) {
                        peg$savedPos = peg$currPos;
                        s10 = peg$c28(s2, s4, s7, s9);
                        if (s10) {
                          s10 = void 0;
                        } else {
                          s10 = peg$FAILED;
                        }
                        if (s10 !== peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 58) {
                            s11 = peg$c24;
                            peg$currPos++;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$c25);
                            }
                          }
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parseVarName();
                            if (s12 !== peg$FAILED) {
                              peg$savedPos = peg$currPos;
                              s13 = peg$c29(s2, s4, s7, s9, s12);
                              if (s13) {
                                s13 = void 0;
                              } else {
                                s13 = peg$FAILED;
                              }
                              if (s13 !== peg$FAILED) {
                                if (input.charCodeAt(peg$currPos) === 62) {
                                  s14 = peg$c4;
                                  peg$currPos++;
                                } else {
                                  s14 = peg$FAILED;
                                  if (peg$silentFails === 0) {
                                    peg$fail(peg$c5);
                                  }
                                }
                                if (s14 !== peg$FAILED) {
                                  peg$savedPos = s0;
                                  s1 = peg$c30(s2, s4, s7, s9, s12);
                                  s0 = s1;
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c21);
        }
      }

      return s0;
    }

    function peg$parseDefTag() {
      var s0;

      if (input.substr(peg$currPos, 3) === peg$c31) {
        s0 = peg$c31;
        peg$currPos += 3;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c32);
        }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c33) {
          s0 = peg$c33;
          peg$currPos += 6;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c34);
          }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 7) === peg$c35) {
            s0 = peg$c35;
            peg$currPos += 7;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c36);
            }
          }
        }
      }

      return s0;
    }

    function peg$parseBlock() {
      var s0, s1;

      peg$silentFails++;
      s0 = peg$parseBlockSelfClosing();
      if (s0 === peg$FAILED) {
        s0 = peg$parseBlockWithContent();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c37);
        }
      }

      return s0;
    }

    function peg$parseBlockSelfClosing() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c38) {
        s1 = peg$c38;
        peg$currPos += 7;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c39);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseVarName();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsews();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsews();
          }
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c1) {
              s4 = peg$c1;
              peg$currPos += 2;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c2);
              }
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c40(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseBlockWithContent() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c38) {
        s1 = peg$c38;
        peg$currPos += 7;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c39);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseVarName();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsews();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsews();
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 62) {
              s4 = peg$c4;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c5);
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parseNodes();
              if (s5 !== peg$FAILED) {
                if (input.substr(peg$currPos, 8) === peg$c41) {
                  s6 = peg$c41;
                  peg$currPos += 8;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$c42);
                  }
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseVarName();
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = peg$currPos;
                    s8 = peg$c43(s2, s5, s7);
                    if (s8) {
                      s8 = void 0;
                    } else {
                      s8 = peg$FAILED;
                    }
                    if (s8 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 62) {
                        s9 = peg$c4;
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$c5);
                        }
                      }
                      if (s9 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c44(s2, s5, s7);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseComment() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c46) {
        s1 = peg$c46;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c47);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        s4 = peg$parseCommentToken();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parseCommentToken();
        }
        if (s3 !== peg$FAILED) {
          s2 = input.substring(s2, peg$currPos);
        } else {
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c48) {
            s3 = peg$c48;
            peg$currPos += 3;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c49);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c50(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c45);
        }
      }

      return s0;
    }

    function peg$parseCommentToken() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.substr(peg$currPos, 3) === peg$c48) {
        s2 = peg$c48;
        peg$currPos += 3;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c49);
        }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c51);
          }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseVar() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c53) {
        s1 = peg$c53;
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c54);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseVarName();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsews();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsews();
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 62) {
              s4 = peg$c4;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c5);
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              s6 = peg$parseExpressionTokens();
              if (s6 !== peg$FAILED) {
                s5 = input.substring(s5, peg$currPos);
              } else {
                s5 = s6;
              }
              if (s5 !== peg$FAILED) {
                if (input.substr(peg$currPos, 6) === peg$c55) {
                  s6 = peg$c55;
                  peg$currPos += 6;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$c56);
                  }
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseVarName();
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = peg$currPos;
                    s8 = peg$c57(s2, s5, s7);
                    if (s8) {
                      s8 = void 0;
                    } else {
                      s8 = peg$FAILED;
                    }
                    if (s8 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 62) {
                        s9 = peg$c4;
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$c5);
                        }
                      }
                      if (s9 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c58(s2, s5, s7);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c52);
        }
      }

      return s0;
    }

    function peg$parseExpression() {
      var s0, s1;

      peg$silentFails++;
      s0 = peg$parseEscapedExpression();
      if (s0 === peg$FAILED) {
        s0 = peg$parseUnescapedExpression();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c59);
        }
      }

      return s0;
    }

    function peg$parseEscapedExpression() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c60) {
        s1 = peg$c60;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c61);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parseExpressionTokens();
        if (s3 !== peg$FAILED) {
          s2 = input.substring(s2, peg$currPos);
        } else {
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 125) {
            s3 = peg$c62;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c63);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c64(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseUnescapedExpression() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c65) {
        s1 = peg$c65;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c66);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parseExpressionTokens();
        if (s3 !== peg$FAILED) {
          s2 = input.substring(s2, peg$currPos);
        } else {
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 125) {
            s3 = peg$c62;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c63);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c67(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseExpressionTokens() {
      var s0, s1;

      s0 = [];
      s1 = peg$parseExpressionToken();
      if (s1 !== peg$FAILED) {
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$parseExpressionToken();
        }
      } else {
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseExpressionToken() {
      var s0;

      s0 = peg$parseStringLiteral();
      if (s0 === peg$FAILED) {
        s0 = peg$parseObjectLiteral();
        if (s0 === peg$FAILED) {
          if (peg$c68.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c69);
            }
          }
        }
      }

      return s0;
    }

    function peg$parseObjectLiteral() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c70;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c71);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseExpressionTokens();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 125) {
            s3 = peg$c62;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c63);
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseFlowControl() {
      var s0;

      s0 = peg$parseIfStatement();
      if (s0 === peg$FAILED) {
        s0 = peg$parseEachStatement();
      }

      return s0;
    }

    function peg$parseIfStatement() {
      var s0, s1;

      peg$silentFails++;
      s0 = peg$parseIfStandalone();
      if (s0 === peg$FAILED) {
        s0 = peg$parseIfCompound();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c72);
        }
      }

      return s0;
    }

    function peg$parseIfStandalone() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c73) {
        s1 = peg$c73;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c74);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsews();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c75) {
            s3 = peg$c75;
            peg$currPos += 4;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c76);
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsews();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parsews();
            }
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s5 = peg$c13;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$c14);
                }
              }
              if (s5 !== peg$FAILED) {
                s6 = [];
                s7 = peg$parsews();
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$parsews();
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseAttrValue();
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    s9 = peg$parsews();
                    while (s9 !== peg$FAILED) {
                      s8.push(s9);
                      s9 = peg$parsews();
                    }
                    if (s8 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 62) {
                        s9 = peg$c4;
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$c5);
                        }
                      }
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parseNodes();
                        if (s10 !== peg$FAILED) {
                          if (input.substr(peg$currPos, 5) === peg$c77) {
                            s11 = peg$c77;
                            peg$currPos += 5;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$c78);
                            }
                          }
                          if (s11 !== peg$FAILED) {
                            peg$savedPos = s0;
                            s1 = peg$c79(s7, s10);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseIfCompound() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c80) {
        s1 = peg$c80;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c81);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsews();
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseWhen();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseWhen();
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseOtherwise();
            if (s4 === peg$FAILED) {
              s4 = null;
            }
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 5) === peg$c77) {
                s5 = peg$c77;
                peg$currPos += 5;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$c78);
                }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c82(s3, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseWhen() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c84) {
        s1 = peg$c84;
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c85);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsews();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsews();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c75) {
            s3 = peg$c75;
            peg$currPos += 4;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c76);
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsews();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parsews();
            }
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 61) {
                s5 = peg$c13;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$c14);
                }
              }
              if (s5 !== peg$FAILED) {
                s6 = [];
                s7 = peg$parsews();
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$parsews();
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseAttrValue();
                  if (s7 !== peg$FAILED) {
                    s8 = [];
                    s9 = peg$parsews();
                    while (s9 !== peg$FAILED) {
                      s8.push(s9);
                      s9 = peg$parsews();
                    }
                    if (s8 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 62) {
                        s9 = peg$c4;
                        peg$currPos++;
                      } else {
                        s9 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$c5);
                        }
                      }
                      if (s9 !== peg$FAILED) {
                        s10 = peg$parseNodes();
                        if (s10 !== peg$FAILED) {
                          if (input.substr(peg$currPos, 7) === peg$c86) {
                            s11 = peg$c86;
                            peg$currPos += 7;
                          } else {
                            s11 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$c87);
                            }
                          }
                          if (s11 !== peg$FAILED) {
                            s12 = [];
                            s13 = peg$parsews();
                            while (s13 !== peg$FAILED) {
                              s12.push(s13);
                              s13 = peg$parsews();
                            }
                            if (s12 !== peg$FAILED) {
                              peg$savedPos = s0;
                              s1 = peg$c88(s7, s10);
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c83);
        }
      }

      return s0;
    }

    function peg$parseOtherwise() {
      var s0, s1, s2, s3, s4, s5;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 11) === peg$c90) {
        s1 = peg$c90;
        peg$currPos += 11;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c91);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNodes();
        if (s2 !== peg$FAILED) {
          if (input.substr(peg$currPos, 12) === peg$c92) {
            s3 = peg$c92;
            peg$currPos += 12;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c93);
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$parsews();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parsews();
            }
            if (s4 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c94(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c89);
        }
      }

      return s0;
    }

    function peg$parseEachStatement() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c96) {
        s1 = peg$c96;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c97);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseVarName();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parsews();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parsews();
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c98) {
              s4 = peg$c98;
              peg$currPos += 2;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c99);
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parsews();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parsews();
              }
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 61) {
                  s6 = peg$c13;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$c14);
                  }
                }
                if (s6 !== peg$FAILED) {
                  s7 = [];
                  s8 = peg$parsews();
                  while (s8 !== peg$FAILED) {
                    s7.push(s8);
                    s8 = peg$parsews();
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseAttrValue();
                    if (s8 !== peg$FAILED) {
                      s9 = [];
                      s10 = peg$parsews();
                      while (s10 !== peg$FAILED) {
                        s9.push(s10);
                        s10 = peg$parsews();
                      }
                      if (s9 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 62) {
                          s10 = peg$c4;
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$c5);
                          }
                        }
                        if (s10 !== peg$FAILED) {
                          s11 = [];
                          s12 = peg$parsews();
                          while (s12 !== peg$FAILED) {
                            s11.push(s12);
                            s12 = peg$parsews();
                          }
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parseNodes();
                            if (s12 !== peg$FAILED) {
                              if (input.substr(peg$currPos, 7) === peg$c100) {
                                s13 = peg$c100;
                                peg$currPos += 7;
                              } else {
                                s13 = peg$FAILED;
                                if (peg$silentFails === 0) {
                                  peg$fail(peg$c101);
                                }
                              }
                              if (s13 !== peg$FAILED) {
                                s14 = peg$parseVarName();
                                if (s14 !== peg$FAILED) {
                                  peg$savedPos = peg$currPos;
                                  s15 = peg$c102(s2, s8, s12, s14);
                                  if (s15) {
                                    s15 = void 0;
                                  } else {
                                    s15 = peg$FAILED;
                                  }
                                  if (s15 !== peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 62) {
                                      s16 = peg$c4;
                                      peg$currPos++;
                                    } else {
                                      s16 = peg$FAILED;
                                      if (peg$silentFails === 0) {
                                        peg$fail(peg$c5);
                                      }
                                    }
                                    if (s16 !== peg$FAILED) {
                                      peg$savedPos = s0;
                                      s1 = peg$c103(s2, s8, s12, s14);
                                      s0 = s1;
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$FAILED;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$FAILED;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c95);
        }
      }

      return s0;
    }

    function peg$parseKeyword() {
      var s0, s1, s2;

      if (input.substr(peg$currPos, 7) === peg$c104) {
        s0 = peg$c104;
        peg$currPos += 7;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c105);
        }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c106) {
          s0 = peg$c106;
          peg$currPos += 6;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c107);
          }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 6) === peg$c108) {
            s1 = peg$c108;
            peg$currPos += 6;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c109);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseVarName();
            if (s2 !== peg$FAILED) {
              s1 = [s1, s2];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 4) === peg$c110) {
              s1 = peg$c110;
              peg$currPos += 4;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c111);
              }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parseVarName();
              if (s2 !== peg$FAILED) {
                s1 = [s1, s2];
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 7) === peg$c112) {
                s1 = peg$c112;
                peg$currPos += 7;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) {
                  peg$fail(peg$c113);
                }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$parseVarName();
                if (s2 !== peg$FAILED) {
                  s1 = [s1, s2];
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 8) === peg$c114) {
                  s1 = peg$c114;
                  peg$currPos += 8;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$c115);
                  }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parseVarName();
                  if (s2 !== peg$FAILED) {
                    s1 = [s1, s2];
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c116) {
                    s0 = peg$c116;
                    peg$currPos += 2;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$c117);
                    }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.substr(peg$currPos, 4) === peg$c118) {
                      s0 = peg$c118;
                      peg$currPos += 4;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) {
                        peg$fail(peg$c119);
                      }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 9) === peg$c120) {
                        s0 = peg$c120;
                        peg$currPos += 9;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) {
                          peg$fail(peg$c121);
                        }
                      }
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 5) === peg$c122) {
                          s1 = peg$c122;
                          peg$currPos += 5;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) {
                            peg$fail(peg$c123);
                          }
                        }
                        if (s1 !== peg$FAILED) {
                          s2 = peg$parseVarName();
                          if (s2 !== peg$FAILED) {
                            s1 = [s1, s2];
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                        if (s0 === peg$FAILED) {
                          s0 = peg$currPos;
                          if (input.substr(peg$currPos, 4) === peg$c124) {
                            s1 = peg$c124;
                            peg$currPos += 4;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) {
                              peg$fail(peg$c125);
                            }
                          }
                          if (s1 !== peg$FAILED) {
                            s2 = peg$parseVarName();
                            if (s2 !== peg$FAILED) {
                              s1 = [s1, s2];
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$FAILED;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$FAILED;
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsePlain() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsePlainToken();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsePlainToken();
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c126);
        }
      }

      return s0;
    }

    function peg$parsePlainToken() {
      var s0, s1, s2, s3, s4, s5, s6;

      if (peg$c127.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c128);
        }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 60) {
          s1 = peg$c22;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c23);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 47) {
            s4 = peg$c129;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c130);
            }
          }
          if (s4 === peg$FAILED) {
            s4 = null;
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parseKeyword();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsews();
              if (s6 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 47) {
                  s6 = peg$c129;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) {
                    peg$fail(peg$c130);
                  }
                }
                if (s6 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 62) {
                    s6 = peg$c4;
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) {
                      peg$fail(peg$c5);
                    }
                  }
                }
              }
              if (s6 !== peg$FAILED) {
                s4 = [s4, s5, s6];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = void 0;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            peg$silentFails++;
            if (input.substr(peg$currPos, 3) === peg$c131) {
              s4 = peg$c131;
              peg$currPos += 3;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c132);
              }
            }
            peg$silentFails--;
            if (s4 === peg$FAILED) {
              s3 = void 0;
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              s1 = [s1, s2, s3];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (peg$c133.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c134);
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            peg$silentFails++;
            if (input.charCodeAt(peg$currPos) === 123) {
              s3 = peg$c70;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c71);
              }
            }
            peg$silentFails--;
            if (s3 === peg$FAILED) {
              s2 = void 0;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
              s1 = [s1, s2];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        }
      }

      return s0;
    }

    function peg$parseVarName() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      if (peg$c136.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c137);
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$c138.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c139);
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          if (peg$c138.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c139);
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c135);
        }
      }

      return s0;
    }

    function peg$parseAttrValue() {
      var s0, s1;

      peg$silentFails++;
      s0 = peg$parseSingleQuoteString();
      if (s0 === peg$FAILED) {
        s0 = peg$parseDoubleQuoteString();
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c140);
        }
      }

      return s0;
    }

    function peg$parseSingleQuoteString() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c142;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c143);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        if (peg$c144.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c145);
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          if (peg$c144.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c145);
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = input.substring(s2, peg$currPos);
        } else {
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c142;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c143);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c146(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c141);
        }
      }

      return s0;
    }

    function peg$parseDoubleQuoteString() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c147;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c148);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        if (peg$c149.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c150);
          }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          if (peg$c149.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c150);
            }
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = input.substring(s2, peg$currPos);
        } else {
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c147;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c148);
            }
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c146(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c141);
        }
      }

      return s0;
    }

    function peg$parseStringLiteral() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c147;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c148);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseDoubleStringCharacter();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseDoubleStringCharacter();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c147;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) {
              peg$fail(peg$c148);
            }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 39) {
          s1 = peg$c142;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c143);
          }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseSingleStringCharacter();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parseSingleStringCharacter();
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 39) {
              s3 = peg$c142;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) {
                peg$fail(peg$c143);
              }
            }
            if (s3 !== peg$FAILED) {
              s1 = [s1, s2, s3];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c141);
        }
      }

      return s0;
    }

    function peg$parseDoubleStringCharacter() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 34) {
        s2 = peg$c147;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c148);
        }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 92) {
          s3 = peg$c151;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c152);
          }
        }
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = void 0;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseSourceCharacter();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseEscapeSequence();
      }

      return s0;
    }

    function peg$parseSingleStringCharacter() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 39) {
        s2 = peg$c142;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c143);
        }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = void 0;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 92) {
          s3 = peg$c151;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) {
            peg$fail(peg$c152);
          }
        }
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = void 0;
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseSourceCharacter();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseEscapeSequence();
      }

      return s0;
    }

    function peg$parseSourceCharacter() {
      var s0;

      if (peg$c153.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c154);
        }
      }

      return s0;
    }

    function peg$parseEscapeSequence() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c151;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c152);
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseSourceCharacter();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsews() {
      var s0, s1;

      peg$silentFails++;
      if (peg$c156.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c157);
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) {
          peg$fail(peg$c155);
        }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null, peg$maxFailPos < input.length ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1) : peg$computeLocation(peg$maxFailPos, peg$maxFailPos));
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse: peg$parse
  };
}();

},{}],5:[function(require,module,exports){
'use strict';

module.exports = require('./compiler');

},{"./compiler":3}],6:[function(require,module,exports){
'use strict';

var path = require('path');
var grammar = require('./grammar');
 // for brfs

var runtime = "var globals = {\n    encodeURI: encodeURI,\n    encodeURIComponent: encodeURIComponent,\n    decodeURI: decodeURI,\n    decodeURIComponent: decodeURIComponent,\n    Date: Date,\n    Math: Math,\n    JSON: JSON,\n    Object: Object\n};\n\nfunction extend() {\n    var argv = [].slice.call(arguments);\n    return argv.reduce(function(result, current) {\n        Object.keys(current || {}).forEach(function(key) {\n            result[key] = current[key];\n        });\n        return result;\n    }, {});\n}\n\nfunction escapeHtml(html) {\n    return String(html)\n        .replace(/&/g, '&amp;')\n        .replace(/</g, '&lt;')\n        .replace(/>/g, '&gt;')\n        .replace(/\"/g, '&quot;');\n}\n\nfunction each(obj, varName, locals, fn) {\n    function it(v, k, arr) {\n        locals[varName] = v;\n        locals[varName + '_index'] =\n            locals[varName + '_key'] =\n                k;\n        var isLast = typeof k == 'string' ?\n        arr[arr.length - 1] === k : k === arr.length - 1;\n        locals[varName + '_last'] = isLast;\n        locals[varName + '_has_next'] = !isLast;\n        fn(Object.create(locals));\n    }\n    if (obj == null)\n        return;\n    if (Array.isArray(obj))\n        return obj.forEach(it);\n    if (typeof obj == 'object') {\n        var keys = Object.keys(obj).sort();\n        return keys.forEach(function(k) {\n            it(obj[k], k, keys);\n        });\n    }\n    throw new Error('Non-iterable object ' + obj);\n}\n\n";

var NODE_TYPES = {
    'plain': processPlain,
    'comment': processComment,
    'def': processDef,
    'block': processBlock,
    'include': processInclude,
    'inline': processInline,
    'expr': processExpr,
    'var': processVar,
    'if': processIf,
    'each': processEach
};

/**
 * Unit of work of template compiler.
 *
 * Instances hold job-local stuff like AST cache, parsed expressions
 * and other magic. Instances must not be reused.
 *
 * @private
 */
var Job = module.exports = function (params) {
    this.file = params.file;
    this.load = params.load;
    this.stripComments = params.stripComments;
    this.expressions = [];
    this.cachedNodes = {};
};

Job.prototype.compile = function () {
    var ctx = {
        file: this.file,
        defs: {}
    };
    return this.processFile(this.file, ctx).then(function (code) {
        return new Function('locals', runtime + 'var out = [];' + 'locals = extend({}, globals, locals);' + code + ';return out.join("");');
    });
};

Job.prototype.load = function (file) {
    if (file.indexOf('../') === 0) {
        throw new Error(file + ' is outside scope');
    }
    return this.load(file);
};

Job.prototype.processFile = function (file, ctx) {
    var _this = this;

    var parentFile = ctx.parent && ctx.parent.file;
    file = localPath(parentFile || '', file);
    // Check cache for parsed AST
    var cached = this.cachedNodes[file];
    if (cached) {
        return this.processNodes(cached, ctx);
    }
    // Load and parse template
    return this.load(file).then(function (content) {
        var nodes = grammar.parse(content);
        _this.cachedNodes[file] = nodes;
        return _this.processNodes(nodes, ctx);
    });
};

Job.prototype.processNodes = function (nodes, ctx) {
    var _this2 = this;

    return Promise.all(nodes.map(function (node) {
        return _this2.processNode(node, ctx);
    })).then(function (statements) {
        return statements.join(';');
    });
};

Job.prototype.processNode = function (node, ctx) {
    if (typeof node == 'string') {
        return bufferText(node);
    }
    var handler = NODE_TYPES[node.type];
    if (!handler) {
        throw new Error('Unknown node type: ' + node.type);
    }
    return handler.call(this, node, ctx);
};

function processPlain(text) {
    return bufferText(text);
}

function processComment(node) {
    if (this.stripComments) {
        return;
    }
    return bufferText('<!--' + node.content + '-->');
}

function processDef(node, ctx) {
    return this.processNodes(node.nodes, ctx).then(function (code) {
        var def = ctx.defs[node.name];
        if (def) {
            switch (def.mode) {
                case 'append':
                    code = [def.code, code].join(';');
                    break;
                case 'prepend':
                    code = [code, def.code].join(';');
                    break;
            }
        }
        ctx.defs[node.name] = {
            mode: node.mode,
            code: code
        };
    });
}

function processBlock(node, ctx) {
    var def = findDefinition(node.name, ctx);
    return this.processNodes(node.nodes, ctx).then(function (code) {
        if (!def) {
            return code;
        }
        switch (def.mode) {
            case 'append':
                return [code, def.code].join(';');
            case 'prepend':
                return [def.code, code].join(';');
            default:
                return def.code;
        }
    });
}

function processInclude(node, ctx) {
    var _this3 = this;

    var statements = [];
    var newCtx = {
        parent: ctx,
        file: ctx.file,
        defs: {}
    };
    var promises = node.nodes.map(function (node) {
        return _this3.processNode(node, newCtx);
    });
    return Promise.all(promises).then(function (_statements) {
        _statements.forEach(function (st) {
            return statements.push(st);
        });
        newCtx.file = localPath(newCtx.file, node.file);
        return _this3.processFile(node.file, newCtx);
    }).then(function (code) {
        return scoped(statements.concat([code]).join(';'));
    });
}

function processInline(node, ctx) {
    var escaped = true;
    if (node.file.indexOf('!') === 0) {
        escaped = false;
        node.file = node.file.substring(1);
    }
    var file = localPath(ctx.file, node.file);
    return this.load(file).then(function (content) {
        return escaped ? bufferEscapedText(content) : bufferText(content);
    });
}

function processExpr(node) {
    var expr = wrapExpr(node.expr);
    return node.escape ? bufferEscaped(expr) : buffer(expr);
}

function processVar(node) {
    return 'locals.' + node.name + ' = ' + wrapExpr(node.expr);
}

function processIf(node, ctx) {
    var _this4 = this;

    var promises = node.when.map(function (when) {
        var ifCap = 'if (' + wrapExpr(when.expr) + ')';
        return _this4.processNodes(when.nodes, ctx).then(function (code) {
            return ifCap + '{' + code + '}';
        });
    });
    return Promise.all(promises).then(function (ifs) {
        var statement = ifs.join(' else ');
        if (!node.otherwise) {
            return scoped(statement);
        }
        return _this4.processNodes(node.otherwise.nodes, ctx).then(function (code) {
            return scoped(statement + 'else {' + code + '}');
        });
    });
}

function processEach(node, ctx) {
    var statement = 'each(' + wrapExpr(node.expr) + ',' + JSON.stringify(node.name) + ',' + 'locals,' + 'function(locals) {';
    return this.processNodes(node.nodes, ctx).then(function (code) {
        return scoped(statement + code + '})');
    });
}

function localPath(relativeTo, file) {
    if (file.indexOf('/') === 0) {
        return path.normalize(file).replace(/^\/+/, '');
    }
    return path.normalize(path.join(path.dirname(relativeTo), file));
}

function findDefinition(name, ctx) {
    var def = ctx.defs[name];
    if (def) {
        return def;
    }
    return ctx.parent ? findDefinition(name, ctx.parent) : null;
}

function scoped(code) {
    return '(function(locals){' + code + '})(Object.create(locals))';
}

function wrapExpr(expr) {
    return '(function() { with(locals) { return ' + expr + ' }})()';
}

function bufferText(str) {
    return buffer(JSON.stringify(str));
}

function bufferEscapedText(str) {
    return bufferEscaped(JSON.stringify(str));
}

function bufferEscaped(code) {
    return buffer('escapeHtml(' + code + ')');
}

function buffer(code) {
    return 'out.push(' + code + ')';
}

},{"./grammar":4,"path":1}]},{},[5])(5)
});