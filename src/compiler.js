'use strict';

const path = require('path');
const Job = require('./job');

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
    const stripComments = !!options.stripComments;

    function compile(file) {
        file = path.normalize(file);
        const job = new Job({
            file,
            load,
            stripComments
        });
        return job.compile();
    }

    compile.render = function(file, data) {
        return compile(file).then(fn => fn(data));
    };

    return compile;
};

