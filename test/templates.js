'use strict';

const createCompiler = require('../src/compiler');
const fs = require('fs-promise');
const path = require('path');
const assert = require('assert');

function assertHtml(actual, expected) {
    actual = actual.replace(/\s+</g, '<').replace(/>\s+/g, '>');
    expected = expected.replace(/\s+</g, '<').replace(/>\s+/g, '>');
    assert.equal(actual, expected);
}

function assertHtmlFile(actual, expectedFile) {
    return fs.readFile(path.join(__dirname, 'templates', expectedFile), 'utf-8')
        .then(expected => assertHtml(actual, expected));
}

describe('Compiler', function() {

    function load(file) {
        return fs.readFile(path.join(__dirname, 'templates', file), 'utf-8');
    }

    const compiler = createCompiler(load);

    const users = [
        { name: 'Alice' },
        { name: 'Joe' },
        { name: 'Jane' }
    ];

    it('should process simple includes', function() {
        return compiler.render('includes/index.html')
            .then(html => assertHtmlFile(html, 'includes/_index.html'));
    });

    it('should process layouts with block redifinition', function() {
        return compiler.render('layouts/users/list.html')
            .then(html => assertHtmlFile(html, 'layouts/users/_list.html'));
    });

    it('should maintain def scopes', function() {
        return compiler.render('localdefs/index.html')
            .then(html => assertHtmlFile(html, 'localdefs/_index.html'));
    });

    it('should execute expressions', function() {
        return compiler.render('expressions/index.html')
            .then(html => assertHtmlFile(html, 'expressions/_index.html'));
    });

    it('should process vars with respect to scopes', function() {
        return compiler.render('vars/index.html', { label: null })
            .then(html => assertHtmlFile(html, 'vars/_index.html'));
    });

    it('should process inlines', function() {
        return compiler.render('inlines/index.html')
            .then(html => assertHtmlFile(html, 'inlines/_index.html'));
    });

    it('should process if when statements', function() {
        return compiler.render('if/index.html', { friends: 2 })
            .then(html => assertHtmlFile(html, 'if/_2.html'));
    });

    it('should process if otherwise statements', function() {
        return compiler.render('if/index.html', { friends: 100500 })
            .then(html => assertHtmlFile(html, 'if/_100500.html'));
    });

    it('should process each statements with arrays', function() {
        return compiler.render('each/index.html', { users: users })
            .then(html => assertHtmlFile(html, 'each/_array.html'));
    });

    it('should process each statements with objects', function() {
        return compiler.render('each/index.html', {
            users: {
                alice: 'Alice',
                bob: 'Bob'
            }
        })
            .then(html => assertHtmlFile(html, 'each/_object.html'));
    });

    it('should not strip comments by default', function() {
        return compiler.render('comments/index.html')
            .then(html => assertHtmlFile(html, 'comments/_index.html'));
    });

    it('should strip comments when told to', function() {
        const compile = createCompiler(load, {
            stripComments: true
        });
        return compile('comments/index.html')
            .then(fn => fn())
            .then(html => assertHtmlFile(html, 'comments/_stripped.html'));
    });

});

