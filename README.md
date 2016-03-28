# ZenMill

Isomorphic (Node & Browser) template engine for composing XML-ish documents
(HTML, SVG, etc.)

Key features:

  * **no dependencies**
  * **composable templates** — super powerful includes with blocks
    (akin to Jade's extend/block)
  * **flexibility** — template loading is abstracted from fs,
    you can load templates from fs, db, script tags, etc.
  * **isomorphic** — works both with Node and Browser
  * **asynchronous** compilation, absolutely no synchronous I/O
  * **fast** — compiled template functions can be cached
    (rendering is synchronous and lightning-fast, too)
    
## Prerequisites

ZenMill is written in 2016, so it assumes an environment with native `Promise`
available globally. Use [polyfill](https://github.com/stefanpenner/es6-promise)
if necessary.
  
## Installation

```bash
npm i --save zenmill
```

## Usage

Using ZenMill might seem a bit more involved comparing to most
template engines: you need to create a compiler instance and
provide a template loading function (which is simply a `(path) => Promise<String>`).

Here's an example of how to setup a compiler in Node:

```es6
import zenmill from 'zenmill';
import fs from 'fs-promise';

const compiler = zenmill(file => fs.readFile(`templates/${file}`, 'utf-8'));

export default compiler;
```

And here's how one could setup a loading in browser (assumes browserify + babelify):

```es6
import zenmill from 'zenmill';

const compiler zenmill(file => {
  const elem = document.getElementById(file);
  if (!elem) {
    throw new Error(`Template ${file} not found.`);
  }
  return elem.textContent;
});

export default compiler;
```

Then use `compiler.render` to render templates:

```es6
compiler.render('users/list.html', { users })
    .then(html => ...)
```

Each template is compiled asynchronously into a function using `compiler.compile`.
This function can then be called synchronously to render template with provided `data`.

Here's an ES7 example of how we could implement mtime-based caching
of template functions:

```es6
import zenmill from 'zenmill';
import fs from 'fs-promise';

const cache = {};

const compiler = zenmill(file => fs.readFile('templates/' + file, 'utf-8'));

async function compile(file) {
  const cached = cache[file];
  if (cached) {
    const stat = await fs.stat('templates/' + file);
    if (cached.mtime > stat.mtime.getTime()) {
      return cached.fn; 
    }
  }
  const fn = await compiler.compile(file);
  cached[file] = { mtime: Date.now(), fn };
  return fn;
}

export async function render(file, data) {
  const fn = await compile(file);
  return fn(data);
}
```
  
## Templates syntax: compile-time constructs

Following features are processed at compile time.

### Includes

One file can be included into another one with `<include file="path/to/file"/>`.

Paths that start with `/` are relative to `base`, all other paths are relative
to the file where they are used.

Simple includes are useful for reusing fragments.

Includes are processed statically, so there is no support for dynamic values
in paths. If you think about caching precompiled functions, you'll understand
the reasoning behind this.

#### Example

index.html:

```html
<!doctype html>
<html>
  <head>
  </head>
  <body>
    <include file='header.html'/>
    <h1>Content</h1>
  </body>
</html>
```

header.html:

```html
<header>Hello World!</header>
```

Rendered index.html:

```html
<!doctype html>
<html>
  <head>
  </head>
  <body>
    <header>Hello World!</header>
    <h1>Content</h1>
  </body>
</html>
```

### Layouts, blocks, definitions

More complex template composition scenarios involve reusing of _layouts_ (abstract markup that defines document structure) and _components_ (self-contained markup with parameters).

These scenarios can be implemented by using includes together with _blocks_ — named placeholders for actual content. Blocks can be declared anywhere using `<block:block_name>` tag, they can also contain
arbitrary default content.

Concrete pages provide block definitions using `<def:block_name>` inside
`<include>` tags. Each definition is local to its include (and its descendants)
but is not "visible" to siblings.

#### Example

layout.html:

```html
<!doctype html>
<html>
  <head>
  </head>
  <body>
    <block:content/>
  </body>
</html>
```

index.html:

```html
<include file='layout.html'>

  <def:content>
    <h1>Hello World!</h1>
  </def:content>

</include>
```

Rendered index.html:

```html
<!doctype html>
<html>
  <head>
  </head>
  <body>
    <h1>Hello World!</h1>
  </body>
</html>
```

#### More complex example

It is often convenient to inherit layouts. Consider the following example (based on the previous one).

users/layout.html:

```html
<include file='../layout.html'>

  <def:content>
    <nav>
      <a href='/'>Back to home</a>
    </nav>
    <section>
      <block:content/>
    </section>
  </def:content>

</include>
```

users/list.html:

```html
<include file='layout.html'>

  <def:content>
    <ul>
      <li>Alice</li>
      <li>Joe</li>
      <li>Jane</li>
    </ul>
  </def:content>

</include>
```

Rendered users/list.html:

```html
<!doctype html>
<html>
  <head>
  </head>
  <body>
    <nav>
      <a href='/'>Back to home</a>
    </nav>
    <section>
      <ul>
        <li>Alice</li>
        <li>Joe</li>
        <li>Jane</li>
      </ul>
    </section>
  </body>
</html>
```

You see, users/layout.html provides partial definition for `content` by defining
another block (with the same name). In fact, the result is quite intuitive if you
follow the templates code "inside-out" (`users/list.html` -> `users/layout.html` -> `layout.html`).

### Inline file

Use `<inline file="some/file"/>` to include the contents of specified file "as is".

Unlike includes, inlined files are not compiled (so blocks and definitions are not supported).

By default, the contents of inlined file will be HTML-escaped to prevent XSS (i.e. `<` are replaced with `&lt;`, '&' with '&amp;', etc.). To disable escaping type `!` at the start of file path `<inline file="!path/to/file"/>`.

## Template syntax: dynamic constructs

Following features involve working with template data (at the render phase).

Most dynamic constructs are _scoped_, i.e. variables defined in inner tags
are not visible outside.

### Expressions

Expressions are used to access and modify data provided at the rendering phase.

All expressions are `eval`'d, so use with caution (e.g. no untrusted code).

#### Escaping

Expressions in `#{expr}` are HTML-escaped (i.e. `<` are replaced with `&lt;`, `&` — with `&amp;`, etc.) To avoid escaping use `!{expr}` syntax.

### Variable Assignment

Use `<var:myVar>expr</var:myVar>` to define `myVar` variable with value equal to
the result of `expr` evaluation.

Variables defined on "top-level" scope are bound directly to `data` object, 
but variables from inner scopes do not leak outside.

### If Statement

Conditional statements are implemented like this:

```html
<if>
  <when expr="!friends">
    <p>You have no friends.</p>
  </when>
  <when expr="friends == 1">
    <p>You have one friend.</p>
  </when>
  <when expr="friends > 1 && friends < 5">
    <p>You have a few friends.</p>
  </when>
  <otherwise>
    <p>You have #{friends} friends.</p>
  </otherwise>
</if>
```

Simple single-expression ifs are also supported:

```html
<if expr='happy'>Yay!</if>
```

### Each Statement

To iterate over collections (arrays or objects) use `<each:varName in="collection">...`.

#### Each with Array

Let's say your data looks like this:

```js
{
  users: [
    { name: 'Alice' },
    { name: 'Joe' },
    { name: 'Jane' }
  ]
}
```

And your template like this:

```html
<ul>
  <each:user in="users">
    <li>#{user_index}: #{user.name}</li>
  </each:user>
</ul>
```

Here's what will be rendered:

```html
<ul>
  <li>0: Alice</li>
  <li>1: Joe</li>
  <li>2: Jane</li>
</ul>
```

There you define the `user` variable which will hold the value on each iteration.

Some additional variables become available inside `<each:user>` scope:

  * `user_index` — zero-based index of current element;
  * `user_last` — boolean indicating whether current element is the last one;
  * `user_has_next` — same as `!user_last`

#### Each with Object

Let's say your data looks like this:

```js
{
  users: {
    alice: 'Alice',
    bob: 'Bob'
  }
}
```

And your template like this:

```html
<ul>
  <each:user in="users">
    <li>#{user_key}: #{user}</li>
  </each:user>
</ul>
```

Here's what will be rendered:

```html
<ul>
  <li>alice: Alice</li>
  <li>bob: Bob</li>
</ul>
```

Again, `user` variable holds the value on each iteration. Keys are always
sorted in alphabetical order.

Some additional variables become available inside `<each:user>` scope:

  * `user_key` — key of current element;
  * `user_last` — boolean indicating whether current element is the last one;
  * `user_has_next` — same as `!user_last`

## Grammar

A [PegJS](http://pegjs.org) grammar [is available](src/grammar.peg).

## Notes on compilation

Tags like `include`, `inline`, `block`, `def`, `append`, `prepend`, etc. are
compiled _statically_. This means no support for dynamic includes (sorry), but
OTOH you can cache statically compiled functions for rendering same templates with different data almost at the light speed.

Compilation is done like this:

  * AST nodes are [visited recursively](src/job.js#L9);
  * each method returns a string `statement` (code);
  * you can use stuff from `runtime.js` in statements (but not in templates themselves);
  * buffered statements (the ones that actually spit content) look like `out.push(something)`;
  * `locals` object is the data you provide to compiled function at rendering stage;
  * expressions are wrapped in IIFE and `with(locals)` statement;
  * every scope-sensitive code is wrapped into a function, which inherits from locals object;
  * all statements are simply joined with semicolon and are wrapped into `function (locals) { }`
  
## Questions and Answers

### Why not ship caching if that's so easy?

— Because we don't want neither dependencies nor coupling. The only thing that 
couples template engine to platform (e.g. Node or Browser or whatever)
is template loading (including "includes"), therefore we keep that abstracted.
We also believe that simple caching is rather straightforward to implement
(especially with ES7), while complex ones would benefit from custom approach.
    
### Why do you need templates in browser with all these modern frontend frameworks?

— Most probably, you don't. However, there are definitely some use cases
where you could benefit from isomorphic template engine. Just don't get
obsessed with trying to do that when you don't really need to.

### Why bother abstracting templates loading?

Isn't that easy enough to ship two different loaders for Node and Browser?

— It's easy indeed. Yet, you probably don't realize what cool things
you could do with abstract loaders. Say, you're building a CMS
(where content prerendering matters), and you want templates to be
customizable. In this case you could come up with three levels of templates: 
system => theme => user, where user templates, if exist, override theme templates,
and theme templates override system templates.

This scheme is straightforward with ZenMill by supplying a fallback-based loader
(with logic like "try user, if fails try theme, if fails try system").

The important thing is that this also works with included files: they would
also be resolved using fallback-based algorithm rather than relatively.
This is contrast to **every single template engine** out there.

## License

Copyright (C) 2015 Boris Okunskiy <boris@okunskiy.name> (ISC license)

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
