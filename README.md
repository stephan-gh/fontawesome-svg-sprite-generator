# fontawesome-svg-sprite-generator [![Build Status](https://travis-ci.com/Minecrell/fontawesome-svg-sprite-generator.svg?branch=master)](https://travis-ci.com/Minecrell/fontawesome-svg-sprite-generator) [![Coverage Status](https://coveralls.io/repos/github/Minecrell/fontawesome-svg-sprite-generator/badge.svg?branch=master)](https://coveralls.io/github/Minecrell/fontawesome-svg-sprite-generator?branch=master)

A simple [Node.js] library that generates custom SVG sprite files for a selected number of [Font Awesome] 5 icons.

SVG Sprites make it easy to use [Font Awesome] SVG icons without loading any JavaScript code at runtime.
They work great across all modern browsers* and are simple to use. However, Font Awesome only provides predefined SVG sprite
files that include all icons of an icon pack. In most cases, only a small number of the icons are actually used on the website.
_fontawesome-svg-sprite-generator_ makes it simple to generate SVG Sprites using only the icons you need.

\* **Note:** IE 11 is unable to load SVG symbols from external (i.e. not inlined) SVG sprites. [svg4everybody] exists as a
simple polyfill if you still care about supporting it.

## Contents
- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
  - [Selecting Icons]
  - [Styling]
  - [Options](#options)
- [Build System Integration](#build-system-integration)
  - [Gulp](#gulp)
- [Advanced Usage](#advanced-usage)
  - [Symbol Attributes]
  - [Icon Options]
  - [Accessibility]
- [Contributing](#contributing)
- [License](#license)

## Introduction
Generated SVG sprites will look like the following (prettified):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
Font Awesome Free by @fontawesome - https://fontawesome.com
License - https://fontawesome.com/license (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
-->
<svg xmlns="http://www.w3.org/2000/svg">
    <symbol id="fab-fa-font-awesome" viewBox="0 0 448 512">
        <path fill="currentColor" d="M397.8 32H50.2C22.7 ..."></path>
    </symbol>
</svg>
```

Each SVG icon is included as [`<symbol>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/symbol) with an
**unique ID** in the SVG file. It can then be referenced in HTML as follows:

```html
<svg role="img" class="svg-inline--fa fa-w-14">
    <title>Font Awesome</title>
    <use href="sprite.svg#fab-fa-font-awesome"></use>
</svg>
```

Icons must be styled using CSS to give them the correct size. This can be either done manually, or by loading the
Font Awesome SVG-with-JS CSS stylesheet and applying the correct classes (as done above).
See [Styling] for details.

## Installation
**Note:** [Node.js] 8 or newer is required.
```
npm install fontawesome-svg-sprite-generator
```

You also need to install the icon packs you would like to use from NPM (see [Importing Icons] ("Package names") for details).
Examples for free packages:

```
npm install @fortawesome/free-solid-svg-icons
npm install @fortawesome/free-regular-svg-icons
npm install @fortawesome/free-brands-svg-icons
```

## Usage
_fontawesome-svg-sprite-generator_ uses the [Font Awesome API] to generate SVG icons and bundles them to a single SVG Sprite.
It uses parts of the code that would normally run in the browser. That way, you can still use most features of SVG-with-JS,
except that it is evaluated at build time and not at runtime.

As a quick start, here is a simple example that creates a SVG sprite with only `fa-font-awesome` and writes it to
`sprite.svg`.

```js
const fs = require('fs');
const fab = require('@fortawesome/free-brands-svg-icons');
const faSvgSprite = require('fontawesome-svg-sprite-generator');

const sprite = faSvgSprite.generate([
  fab.faFontAwesome
]);

// sprite.svg contains the raw SVG code for the generated sprite
fs.writeFileSync('sprite.svg', sprite.svg);
```

In this case, the symbol ID `fab-fa-font-awesome` is automatically generated based on the icon name.

### Selecting icons
Icons can be selected using a simple list. In this case, the symbol IDs will be generated automatically:

```js
const fas = require('@fortawesome/free-solid-svg-icons');
const sprite = faSvgSprite.generate([
  fas.faPlus,
  fas.faCircle
]);
```

It is also possible to set symbol IDs manually by using an object instead:

```js
const fas = require('@fortawesome/free-solid-svg-icons');
const sprite = faSvgSprite.generate({
  plus: fas.faPlus,
  circle: fas.faCircle
});
```

You can also lookup icons from the [Icon Library]:

```js
const fa = require('@fortawesome/fontawesome-svg-core');
const fas = require('@fortawesome/free-solid-svg-icons');

fa.library.add(fas);

const sprite = faSvgSprite.generate([
  { prefix: 'fas', iconName: 'plus' },
  { prefix: 'fas', iconName: 'circle' }
]);
```

### Styling
Unfortunately, scaling the SVG icons doesn't quite work as expected by default. To preserve the aspect ratio of the icons,
you will either need to copy the `viewBox` of the icon on each usage, or set both width and height manually using CSS.
Alternativelly, you can re-use Font Awesome's CSS classes from the SVG-with-JS stylesheet.

#### Using Font Awesome's stylesheet
You can re-use the CSS classes that would normally be set automatically when using Font Awesome's SVG-with-JS framework.
However, when using SVG sprites you have to add the CSS classes on each usage manually:

1. Load Font Awesome's SVG-with-JS stylesheet. It is available in different places:
    - In the "For the Web" download on [fontawesome.com] (`css/svg-with-js.css`, minified)
    - In the `@fortawesome/fontawesome-free` NPM package (`css/svg-with-js.css`, minified)
    - In the `@fortawesome/fontawesome-svg-core` NPM package (`styles.css`, not minified)

2. Add the CSS classes to each usage of the icon: `svg-inline--fa` plus one of the `fa-w-<number>` CSS classes (see below):

    ```html
    <svg class="svg-inline--fa fa-w-14">
        <use href="sprite.svg#fab-fa-font-awesome"></use>
    </svg>
    ```

    The `<number>` in the `fa-w-<number>` class depends on the aspect ratio of the icon. The easiest way to find out the
    correct classes to use is to take a look at the [Symbol Attributes] provided by
    _fontawesome-svg-sprite-generator_:

    ```js
    const sprite = faSvgSprite.generate(...);
    console.log(sprite.attributes);
    /* Prints:
    { 'fab-fa-font-awesome':
       { class: 'svg-inline--fa fa-font-awesome fa-w-14',
         viewBox: '0 0 448 512' } }
    */
    ```

    `class` contains the CSS classes SVG-with-JS would apply. (The icon specific `fa-font-awesome` CSS class doesn't seem
    to have any effect currently...)

    If you really would like to know: SVG-with-JS calculates them using `(width / height) * 16` (rounded up)
    where width and height are taken from the `viewBox` of the icon:
      - `viewBox="0 0 448 512"` results in `(448 / 512) * 16 = fa-w-14` as used above.

3. You can make use of many additional styles as shown in the
   [Styling section of the Font Awesome documentation](https://fontawesome.com/how-to-use/on-the-web/styling)
   (e.g. making the icons larger or setting a fixed width...)

#### Using `viewBox` and custom CSS
Alternatively, you can copy the `viewBox` to the `<svg>` element of each usage to make the browser aware of the correct
aspect ratio of the icon. That way, the icon will scale correctly even if you define only one dimension (you should
probably do this with CSS classes instead of inline attributes...):

```html
<svg viewBox="0 0 448 512" style="height: 1em">
    <use href="sprite.svg#fab-fa-font-awesome"></use>
</svg>
```

As with the CSS classes, the `viewBox` is specific to each icon. You can either lookup the `<symbol>` for the icon in the
generated SVG sprite and copy its `viewBox`, or take another look at the [Symbol Attributes] provided by
_fontawesome-svg-sprite-generator_:

```js
const sprite = faSvgSprite.generate(...);
console.log(sprite.attributes);
/* Prints:
{ 'fab-fa-font-awesome':
   { class: 'svg-inline--fa fa-font-awesome fa-w-14',
     viewBox: '0 0 448 512' } }
*/
```

#### Setting width and height manually
Obviously, you can also do everything yourself and just set `width` and `height` manually using CSS.
In this case, you need to be really careful to preserve the correct aspect ratio, though...

### Options
There are a number of options that can be used to customize the generated SVG sprite.
They should be passed as additional argument to the `generate` method:

```js
const options = {
  // Exclude XML declaration (e.g. `<?xml version="1.0" encoding="UTF-8"?>`)
  //xmlDeclaration: false,

  // Change license attribution within the generated SVG sprite file.
  //license: ' Some other license text ',

  // Remove license attribution entirely
  //license: '',
};
const sprite = faSvgSprite.generate(/* icons... */, options);
```

The `license` option may be relevant when using _fontawesome-svg-sprite-generator_ with Font Awesome Pro: By default,
the license attribution for Font Awesome Free is included in the generated SVG document.

## Build System Integration
### Gulp
_fontawesome-svg-sprite-generator_ can be easily integrated into Gulp builds. Since usage pretty much only involves
writing the generated SVG into a file, I decided against writing yet another Gulp plugin and provide instructions here
instead.

#### Basic Usage
```js
const fs = require('fs');
const fab = require('@fortawesome/free-brands-svg-icons');
const faSvgSprite = require('fontawesome-svg-sprite-generator');

gulp.task('icons', done => {
  const sprite = faSvgSprite.generate([fab.faFontAwesome]);
  fs.writeFile('sprite.svg', sprite.svg, done);
});
```

#### Transforming SVG with streams
A bit more effort is needed if you'd like to transform the generated SVG with other Gulp plugins:


```js
const stream = require('stream');
const File = require('vinyl');
const fab = require('@fortawesome/free-brands-svg-icons');
const faSvgSprite = require('fontawesome-svg-sprite-generator');

gulp.task('icons', () => {
  const sprite = faSvgSprite.generate([fab.faFontAwesome]);

  return new stream.Readable({
    objectMode: true,
    read() {
      this.push(new File({
        path: 'sprite.svg',
        contents: new Buffer(sprite.svg),
      });
      this.push(null);
    }
  })
    .pipe(...)
    .pipe(gulp.dest('dist'));
});
```

#### Symbol Attributes
If you'd like to serialize the [Symbol Attributes] into an additional JSON file, using Promises is easier:

```js
const util = require('util');
const writeFile = util.promisify(require('fs').writeFile);
const fab = require('@fortawesome/free-brands-svg-icons');
const faSvgSprite = require('fontawesome-svg-sprite-generator');

gulp.task('icons', () => {
  const sprite = faSvgSprite.generate([fab.faFontAwesome]);
  return Promise.all([
    writeFile('sprite.svg', sprite.svg),
    writeFile('sprite-attributes.json', JSON.stringify(sprite.attributes)),
  ]);
});
```

## Advanced Usage
### Symbol Attributes
Figuring out the correct CSS classes or `viewBox` to use can be painful (see [Styling]). To simplify this, an additional
object of _Symbol Attributes_ is exposed when generating a sprite. It maps the unique IDs of the symbols to the correct
set of attributes needed for each usage of the icon. Serialized into a JSON file, it can be plugged into any templating
language to avoid having to lookup the attributes manually.

```js
const fs = require('fs');
const fab = require('@fortawesome/free-brands-svg-icons');
const faSvgSprite = require('fontawesome-svg-sprite-generator');

const sprite = faSvgSprite.generate([
  fab.faFontAwesome
]);

// sprite.svg contains the raw SVG code for the generated sprite
fs.writeFileSync('sprite.svg', sprite.svg);

// sprite-attributes.json contains the Symbol Attributes for the generated sprite
fs.writeFileSync('sprite-attributes.json', JSON.stringify(sprite.attributes));
```

Results in:

```json
{
  "fab-fa-font-awesome": {
    "class": "svg-inline--fa fa-font-awesome fa-w-14",
    "viewBox": "0 0 448 512"
  }
}
```

Example code for integration into some template languages (feel free to contribute!):
- _Coming Soon_

### Icon Options
The [Font Awesome API] provides a couple of options that affect the generation of SVG code for the icon. You can use them
to apply ["Power Transforms"](https://fontawesome.com/how-to-use/on-the-web/styling/power-transforms),
[mask icons](https://fontawesome.com/how-to-use/on-the-web/styling/masking) or setting an icon title for [Accessibility].

Check the [`icon()` Font Awesome API documentation](https://fontawesome.com/how-to-use/with-the-api/methods/icon) for a list
of possible options (starting with "Using a transform").

Options are provided by using an array/tuple in place of the icon lookup:

```js
const fab = require('@fortawesome/free-brands-svg-icons');
const sprite = faSvgSprite.generate({
  'fontawesome-transformed': [fab.faFontAwesome, {
    transform: {
      rotate: 90
    }
  }],
});
```

**Note:** These transforms will be applied at build time; therefore you need to embed all transformed icons manually into
the SVG sprite. It might make more sense to use CSS to apply some of these transforms...

### Accessibility
The [Icon Options] above can be used to define a title for the icon that will be included as fallback description for the
icon in the generated SVG document:

```js
const fab = require('@fortawesome/free-brands-svg-icons');
const sprite = faSvgSprite.generate({
  fontawesome: [fab.faFontAwesome, {
    title: 'Font Awesome'
  }],
});
```

More important, however, is correctly annotating the usage of the icons in the HTML code:

- **Decorative Icons:** If your icon should be ignored by screen readers (e.g. because there is text next to it),
  add either `role="presentation"` or `aria-hidden` to the surrounding SVG element:

    ```html
    <svg role="presentation" class="svg-inline--fa fa-w-14">
        <use href="sprite.svg#fab-fa-font-awesome"></use>
    </svg>
    ```

- **Standalone Icons:** If alternative text should be read out by screen readers, add `role="img"` and define a meaningful
  `<title>` for the icon:

    ```html
    <svg role="img" class="svg-inline--fa fa-w-14">
        <title>Font Awesome</title>
        <use href="sprite.svg#fab-fa-font-awesome"></use>
    </svg>
    ```

## Contributing
_fontawesome-svg-sprite-generator_ is written in [TypeScript].
  - `npm run build`: Compile TypeScript into JavaScript (in the `dist` folder)
  - `npm test`: Run the unit tests to ensure everything is still working

## License
_fontawesome-svg-sprite-generator_ is licensed under the [MIT License](LICENSE).
This is **not** an official Fort Awesome project.

[Node.js]: https://nodejs.org
[Font Awesome]: https://fontawesome.com
[fontawesome.com]: https://fontawesome.com
[Font Awesome API]: https://fontawesome.com/how-to-use/with-the-api
[Importing Icons]: https://fontawesome.com/how-to-use/with-the-api/setup/importing-icons
[Icon Library]: https://fontawesome.com/how-to-use/with-the-api/setup/library
[svg4everybody]: https://github.com/jonathantneal/svg4everybody
[TypeScript]: https://www.typescriptlang.org

[Selecting Icons]: #selecting-icons
[Styling]: #styling
[Symbol Attributes]: #symbol-attributes
[Icon Options]: #icon-options
[Accessibility]: #accessibility
