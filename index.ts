import {
    AbstractElement,
    Icon,
    icon as fontAwesomeIcon,
    IconLookup,
    IconParams,
    toHtml,
} from '@fortawesome/fontawesome-svg-core'

export type IconQuery = IconLookup | [IconLookup, IconParams];
export type IconDescriptor = IconQuery | Icon;
export type IconDescriptors = IconDescriptor[] | { [id: string]: IconDescriptor };

/**
 * Additional options for the SVG sprite generation.
 */
export interface Options {
    /**
     * Include a XML declaration (e.g. `<?xml version="1.0" encoding="UTF-8"?>`)
     * in the SVG output.
     *
     * @default true
     */
    xmlDeclaration?: boolean;

    /**
     * A license string to include in the SVG document. Can be empty to disable.
     * Defaults to the usual attribution notice for Font Awesome Free.
     */
    license?: string;
}

/**
 * A SVG sprite generated for a number of Font Awesome icons.
 */
export interface Sprite {
    /**
     * The abstract representation of the generated SVG document.
     * Can be used to make further modifications to the SVG document.
     */
    readonly abstract: AbstractElement;

    /**
     * The raw SVG markup of the generated SVG document.
     */
    readonly svg: string;

    /**
     * The symbols contained in this sprite.
     */
    readonly symbols: IconSymbol[];

    /**
     * A map with additional attributes for each symbol.
     * Can be serialized to JSON for use in various template languages.
     */
    readonly attributes: { [id: string]: SymbolAttributes }
}

/**
 * Additional attributes for an {@link IconSymbol}.
 */
export interface SymbolAttributes {
    /**
     * (Optional) CSS classes for the icon.
     * Can be used to automatically set the correct size of the icon.
     *
     * To use them, load the stylesheet (`fa-svg-with-js.css`) and add
     * the specified list of classes to all uses of the SVG icon. You
     * can also add
     * {@link https://fontawesome.com/how-to-use/on-the-web/styling|further CSS classes}
     * to customize the style.
     *
     * @example
     * ```xml
     *
     * <svg class="... insert classes here">
     *     <use href="sprite.svg#id"></use>
     * </svg>
     * ```
     * @see {@link https://github.com/Minecrell/fontawesome-svg-sprite-generator#styling|Styling}
     */
    readonly class: string;

    /**
     * The SVG `viewBox` of the icon. Without a `viewBox` on the `<svg>`
     * element surrounding the `<use>` element on each usage, the icon won't
     * scale correctly unless both width and height are set using CSS
     * (e.g. using {@link #class}).
     *
     * To scale the icons while preserving their aspect ratio, the correct
     * `viewBox` must be supplied on each use of the icon.
     *
     * @example
     * ```xml
     *
     * <svg viewBox="... insert view box here">
     *     <use href="sprite.svg#id"></use>
     * </svg>
     *
     * ```
     * @see {@link https://github.com/Minecrell/fontawesome-svg-sprite-generator#styling|Styling}
     */
    readonly viewBox: string;

    /**
     * The title provided for accessibility for this icon.
     */
    readonly title?: string;
}

/**
 * A single icon contained as `<symbol>` in a SVG {@link Sprite}.
 */
export interface IconSymbol {
    /**
     * The unique ID of this symbol.
     */
    readonly id: string;

    /**
     * The {@link Icon} this symbol was generated for.
     */
    readonly icon: Icon;

    /**
     * The abstract representation of this symbol in SVG.
     */
    readonly symbol: AbstractElement;

    /**
     * Additional attributes for this symbol.
     */
    readonly attributes: SymbolAttributes;
}

/**
 * Generates a SVG sprite for the selected icons.
 *
 * The first parameter may be either an object, mapping each icon to an
 * (unique) ID, or an array (in which case an ID will be generated
 * automatically for each icon).
 *
 * Icon selection generally works the same way as in the Font Awesome
 * JS API. Check README of module for usage examples.
 *
 * @param {IconDescriptors} icons The icons to include in the sprite
 * @param {Options} options Additional options
 * @returns {Sprite} The generated SVG sprite
 *
 * @see {@link https://fontawesome.com/how-to-use/font-awesome-api#findicondefinition|findIconDefinition()}
 * @see {@link https://fontawesome.com/how-to-use/font-awesome-api#icon|icon()}
 */
export function generate(icons: IconDescriptors, options: Options = {}): Sprite {
    const symbols = prepareSymbols(icons);
    return generateSprite(symbols, options);
}

function prepareSymbols(icons: IconDescriptors) {
    if (Array.isArray(icons)) {
        return icons
            .map(icon => prepareSymbol(loadSymbol(icon)));
    } else {
        return Object.entries(icons)
            .map(([id, icon]) => prepareSymbol(loadSymbol(icon, id), id));
    }
}

function loadSymbol(icon: IconDescriptor, id?: string) {
    if ('abstract' in icon) {
        return icon;
    }

    const [lookup, params] = Array.isArray(icon) ? icon : [icon, {}];

    // Ensure we generate a symbol with the specified id
    params.symbol = params.symbol || id || true;

    const result = fontAwesomeIcon(lookup, params);
    if (!result) {
        throw new Error(`Failed to generate symbol for ${icon}`)
    }

    return result;
}

const ALLOWED_ATTRIBUTES = ['viewBox', 'aria-labelledby'];

function findTitle(symbol: AbstractElement): string | undefined {
    const title = (symbol.children || []).find(e => e.tag === 'title');
    return title && title.children + '';
}

function prepareSymbol(icon: Icon, customId?: string): IconSymbol {
    const abstract = icon.abstract;
    if (abstract.length !== 1) {
        throw new Error('Unexpected number of root elements:\n' + abstract.map(toHtml).join('\n'));
    }

    const svg = abstract[0];
    if (svg.tag !== 'svg') {
        throw new Error(`Unexpected root tag: '${svg.tag}' (expected 'svg')`);
    }
    if (!svg.children) {
        throw new Error('SVG has no children');
    }
    if (svg.children.length !== 1) {
        throw new Error('Multiple elements included in SVG:\n' + svg.children.map(toHtml).join('\n'));
    }

    const symbol = svg.children[0];
    if (symbol.tag !== 'symbol') {
        throw new Error(`Unexpected element in SVG: '${symbol.tag}' (expected 'symbol'). Did you set {symbol: true}?`);
    }

    const title = findTitle(symbol);

    const originalAttributes: { [name: string]: any } = symbol.attributes;
    const attributes: SymbolAttributes = {
        class: originalAttributes.class + '',
        viewBox: originalAttributes.viewBox + '',
        ...(title && {title})
    };

    const id = customId || '' + originalAttributes.id;

    // Remove (mostly unneeded) attributes
    symbol.attributes = { id };

    // Add back allowed attributes
    for (const attribute of ALLOWED_ATTRIBUTES) {
        if (attribute in originalAttributes) {
            symbol.attributes[attribute] = originalAttributes[attribute];
        }
    }

    return { id, icon, symbol, attributes };
}

function generateSprite(symbols: IconSymbol[], options: Options): Sprite {
    const children: AbstractElement[] = [];
    const attributes: { [id: string]: SymbolAttributes } = {};

    for (const icon of symbols) {
        if (icon.id in attributes) {
            throw Error(`Duplicate symbol id '${icon.id}'`);
        }

        children.push(icon.symbol);
        attributes[icon.id] = icon.attributes;
    }

    const abstract: AbstractElement = {
        tag: 'svg',
            attributes: {
            xmlns: 'http://www.w3.org/2000/svg'
        },
        children: children
    };

    return {
        abstract,
        svg: toSvg(abstract, options.xmlDeclaration, options.license),
        symbols,
        attributes
    };
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>\n';
const LICENSE_FREE = `
Font Awesome Free by @fontawesome - https://fontawesome.com
License - https://fontawesome.com/license (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
`;

function toSvg(abstract: AbstractElement, includeXmlDeclaration = true, licenseText = LICENSE_FREE) {
    const xmlDeclaration = includeXmlDeclaration ? XML_DECLARATION : '';
    const license = licenseText ? '<!--' + licenseText + '-->\n' : '';
    return xmlDeclaration + license + toHtml(abstract);
}
