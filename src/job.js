'use strict';

const path = require('path');
const AngularExpressions = require('angular-expressions');
const grammar = require('./grammar');
const fs = require('fs'); // for brfs

const runtime = fs.readFileSync(__dirname + '/runtime.js', 'utf-8');

/**
 * Unit of work of template compiler.
 *
 * Instances hold job-local stuff like AST cache, parsed expressions
 * and other magic. Instances must not be reused.
 *
 * @private
 */
const Job = module.exports = function(params) {
    this.file = params.file;
    this.load = params.load;
    this.stripComments = params.stripComments;
    this.expressions = [];
    this.cachedNodes = {};
};

Job.prototype.compile = function() {
    const ctx = {
        file: this.file,
        defs: {}
    };
    return this.processFile(this.file, ctx)
        .then(code => {
            const fn = new Function('context', runtime +
                'return function(locals) {' +
                'var out = [];' +
                'locals = extend({}, globals, locals);' +
                code +
                ';return out.join("");' +
                '}'
            );
            // TODO get rid of that, just return a function m/b
            return fn({
                expressions: this.expressions
            });
        });
};

Job.prototype.load = function(file) {
    if (file.indexOf('../') === 0) {
        throw new Error(`${file} is outside scope`);
    }
    return this.load(file);
};

Job.prototype.processFile = function(file, ctx) {
    const parentFile = ctx.parent && ctx.parent.file;
    file = localPath(parentFile || '', file);
    // Check cache for parsed AST
    const cached = this.cachedNodes[file];
    if (cached) {
        return this.processNodes(cached, ctx);
    }
    // Load and parse template
    return this.load(file)
        .then(content => {
            const nodes = grammar.parse(content);
            this.cachedNodes[file] = nodes;
            return this.processNodes(nodes, ctx);
        });
};

Job.prototype.processNodes = function(nodes, ctx) {
    return Promise.all(nodes.map(node => this.processNode(node, ctx)))
        .then(statements => statements.join(';'));
};

Job.prototype.processNode = function(node, ctx) {
    if (typeof node == 'string') {
        return bufferText(node);
    }
    const handler = Job.NODE_TYPES[node.type];
    if (!handler) {
        throw new Error('Unknown node type: ' + node.type);
    }
    return handler.call(this, node, ctx);
};

Job.prototype.processPlain = function(text) {
    return bufferText(text);
};

Job.prototype.processComment = function(node, _ctx) {
    if (this.stripComments) {
        return;
    }
    return bufferText('<!--' + node.content + '-->');
};

Job.prototype.processDef = function(node, ctx) {
    return this.processNodes(node.nodes, ctx)
        .then(code => {
            const def = ctx.defs[node.name];
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
};

Job.prototype.processBlock = function(node, ctx) {
    const def = findDefinition(node.name, ctx);
    return this.processNodes(node.nodes, ctx)
        .then(code => {
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
};

Job.prototype.processInclude = function(node, ctx) {
    const statements = [];
    const newCtx = {
        parent: ctx,
        file: ctx.file,
        defs: {}
    };
    const promises = node.nodes.map(node => this.processNode(node, newCtx));
    return Promise.all(promises)
        .then(_statements => {
            _statements.forEach(st => statements.push(st));
            newCtx.file = localPath(newCtx.file, node.file);
            return this.processFile(node.file, newCtx);
        })
        .then(code => scoped(statements.concat([code]).join(';')));
};

Job.prototype.processInline = function(node, ctx) {
    let escaped = true;
    if (node.file.indexOf('!') === 0) {
        escaped = false;
        node.file = node.file.substring(1);
    }
    const file = localPath(ctx.file, node.file);
    return this.load(file)
        .then(content => escaped ? bufferEscapedText(content) : bufferText(content));
};

Job.prototype.processExpr = function(node, _ctx) {
    this.expressions.push(AngularExpressions.compile(node.expr));
    const index = this.expressions.length - 1;
    let st = null;
    if (node.buffer) {
        if (node.escape) {
            st = bufferEscaped('$$[' + index + '](locals)');
        } else {
            st = buffer('$$[' + index + '](locals)');
        }
    } else {
        st = '$$[' + index + '](locals)';
    }
    return st;
};

Job.prototype.processVar = function(node, _ctx) {
    this.expressions.push(AngularExpressions.compile(node.expr));
    const index = this.expressions.length - 1;
    return 'locals.' + node.name + ' = $$[' + index + '](locals)';
};

Job.prototype.processIf = function(node, ctx) {
    const promises = node.when.map(when => {
        this.expressions.push(AngularExpressions.compile(when.expr));
        const index = this.expressions.length - 1;
        const ifCap = 'if ($$[' + index + '](locals))';
        return this.processNodes(when.nodes, ctx)
            .then(code => ifCap + '{' + code + '}');
    });
    return Promise.all(promises)
        .then(ifs => {
            const statement = ifs.join(' else ');
            if (!node.otherwise) {
                return scoped(statement);
            }
            return this.processNodes(node.otherwise.nodes, ctx)
                .then(code => scoped(statement + 'else {' + code + '}'));
        });
};

Job.prototype.processCase = function(node, ctx) {
    let statement = '';
    this.expressions.push(AngularExpressions.compile(node.expr));
    const index = this.expressions.length - 1;
    statement += 'locals.' + node.name + ' = $$[' + index + '](locals);';
    const promises = node.when.map(when=> {
        const expr = AngularExpressions.compile(when.expr);
        this.expressions.push(expr);
        const index = this.expressions.length - 1;
        const ifCap = expr.constant ?
        'if (locals.' + node.name + ' == $$[' + index + '](locals))' :
        'if ($$[' + index + '](locals))';
        return this.processNodes(when.nodes, ctx)
            .then(code => ifCap + '{' + code + '}');
    });
    return Promise.all(promises)
        .then(ifs => {
            statement += ifs.join(' else ');
            if (!node.otherwise) {
                return scoped(statement);
            }
            return this.processNodes(node.otherwise.nodes, ctx)
                .then(code => scoped(statement + ' else {' + code + '}'));
        });
};

Job.prototype.processEach = function(node, ctx) {
    const job = this;
    job.expressions.push(AngularExpressions.compile(node.expr));
    const index = job.expressions.length - 1;
    const statement = 'each($$[' + index + '](locals),' +
        JSON.stringify(node.name) + ',' +
        'locals,' +
        'function(locals) {';
    return this.processNodes(node.nodes, ctx)
        .then(code => scoped(statement + code + '})'));
};

function localPath(relativeTo, file) {
    if (file.indexOf('/') === 0) {
        return path.normalize(file).replace(/^\/+/, '');
    }
    return path.normalize(path.join(path.dirname(relativeTo), file));
}

function findDefinition(name, ctx) {
    const def = ctx.defs[name];
    if (def) {
        return def;
    }
    return ctx.parent ? findDefinition(name, ctx.parent) : null;
}

function scoped(code) {
    return '(function(locals){' + code + '})(Object.create(locals))';
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

Job.NODE_TYPES = {
    'plain': Job.prototype.processPlain,
    'comment': Job.prototype.processComment,
    'def': Job.prototype.processDef,
    'block': Job.prototype.processBlock,
    'include': Job.prototype.processInclude,
    'inline': Job.prototype.processInline,
    'expr': Job.prototype.processExpr,
    'var': Job.prototype.processVar,
    'if': Job.prototype.processIf,
    'case': Job.prototype.processCase,
    'each': Job.prototype.processEach
};
