# ZenMill

Isomorphic (Node & Browser) template engine for composing XML-ish documents
(HTML, SVG, etc.)

Key features:

  * templates composability (super powerful includes)
  * paths abstraction (load templates from fs, db, script tags, etc.)
  * isomorphic — works both with Node and Browser
  * fast — compiled template functions are lru-cached by default
  
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

### Case Statement

Case statements resemble regular switch-case, but allow matching non-declarative conditions:

```html
<case:e expr="friends">
  <when expr="1">
    <p>You have one friend.</p>
  </when>
  <when expr="e > 1 && e <= 5">
    <p>You have a few friends.</p>
  </when>
  <when expr="e > 5">
    <p>You have a #{e} friends.</p>
  </when>
  <otherwise>
    <p>You have no friends.</p>
  </otherwise>
</case:e>
```

In this example `friends` expression is evaluated and becomes accessible 
as local variable `e`.

### Each Statement

To iterate over collections (arrays or objects) use `<each:varName in="collection">...`.

#### Each with Array

Let's say your data looks like this:

```json
{
  users: [
    { name: 'Alice' },
    { name: 'Joe' },
    { name: 'Jane' }
  ];
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

```json
{
  users: {
    alice: 'Alice',
    bob: 'Bob'
  };
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

A [PegJS](http://pegjs.org) grammar [is available](https://github.com/inca/nanotemplates/tree/master/grammar/template.peg).

## Notes on compilation

Tags like `include`, `inline`, `block`, `def`, `append`, `prepend`, etc. are
compiled _statically_. This means no support for dynamic includes (sorry), but
OTOH you can cache statically compiled functions for rendering same templates with different data almost at the light speed.

Compilation is done like this:

  * AST nodes are visited recursively with `_process_<nodetype>` methods;
  * each method returns a string statement (code);
  * you can use stuff from `runtime.js` in statements (but not in templates themselves);
  * buffered statements (the ones that actually spit content) look like `out.push(something)`;
  * expressions are compiled via `eval`, each expression is pushed into an array and becomes available inside code via `$$[<index>]`;
  * `locals` object is the data you provide to compiled function at rendering stage;
  * every scope-sensitive code is wrapped into a function, which copies locals object;
  * all statements are simply joined with semicolon and are wrapped into `function (locals) { }`

## License

Copyright (C) 2015 Boris Okunskiy <boris@okunskiy.name> (ISC license)

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
