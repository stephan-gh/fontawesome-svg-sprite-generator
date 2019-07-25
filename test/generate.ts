import 'mocha';
import * as path from 'path';
import {readFile} from 'fs';
import {expect} from 'chai';
import * as fa from '@fortawesome/fontawesome-svg-core';
import {generate, IconDescriptors, Options, SymbolAttributes} from '../index';

// Add a few (dummy) icons to the Font Awesome icon library
const fasDiceOne: fa.IconDefinition = {
    prefix: 'fas',
    iconName: 'dice-one',
    icon: [448, 512, [], 'f525', 'dice one']
};
const fasBookmark: fa.IconDefinition = {
    prefix: 'fas',
    iconName: 'bookmark',
    icon: [384, 512, [], 'f02e', 'solid bookmark']
};
const farBookmark: fa.IconDefinition = {
    prefix: 'far',
    iconName: 'bookmark',
    icon: [384, 512, [], 'f02e', 'regular bookmark']
};

fa.library.add(fasDiceOne, fasBookmark, farBookmark);

type SpriteTests = { [id: string]: {
    icons?: IconDescriptors;
    options?: Options;
    attributes?: { [id: string]: SymbolAttributes };
    expected?: string;
} }

function testGenerate(tests: SpriteTests, options: Options, subdir: string = '') {
    for (const [name, test] of Object.entries(tests)) {
        it(`generates '${name}' correctly`, done =>
            readFile(path.join(__dirname, 'expected', subdir, `${test.expected || name}.svg`), (err, data) => {
                if (err) throw err;

                // Generate deterministic ids
                Math.random = () => 0;

                const testOptions = Object.assign({}, options, test.options);
                const sprite = generate(test.icons || [], testOptions);

                expect(sprite.svg).to.be.equal(data.toString());

                if (test.attributes) {
                    expect(sprite.attributes).to.be.deep.equal(test.attributes);
                }

                done();
            })
        );
    }
}

function generateAbstract(abstract: fa.AbstractElement[]) {
    const icon = <fa.Icon> { abstract };
    return generate([icon]);
}

describe('generate sprites', () => {
    testGenerate({
        empty: {
            // Doesn't really make sense but ¯\_(ツ)_/¯
            icons: [],
            attributes: {}
        },
        single: {
            icons: [fasDiceOne],
            attributes: {
                'fas-fa-dice-one': {
                    class: 'svg-inline--fa fa-dice-one fa-w-14',
                    viewBox: '0 0 448 512'
                }
            }
        },
        multiple: {
            icons: [fasDiceOne, fasBookmark, farBookmark],
            attributes: {
                'fas-fa-dice-one': {
                    class: 'svg-inline--fa fa-dice-one fa-w-14',
                    viewBox: '0 0 448 512'
                },
                'fas-fa-bookmark': {
                    class: 'svg-inline--fa fa-bookmark fa-w-12',
                    viewBox: '0 0 384 512'
                },
                'far-fa-bookmark': {
                    class: 'svg-inline--fa fa-bookmark fa-w-12',
                    viewBox: '0 0 384 512'
                }
            }
        },
        'custom-ids': {
            icons: {
                'dice': fasDiceOne,
                'bookmark-1': farBookmark,
                'bookmark-2': farBookmark
            },
            attributes: {
                'dice': {
                    class: 'svg-inline--fa fa-dice-one fa-w-14',
                    viewBox: '0 0 448 512'
                },
                'bookmark-1': {
                    class: 'svg-inline--fa fa-bookmark fa-w-12',
                    viewBox: '0 0 384 512'
                },
                'bookmark-2': {
                    class: 'svg-inline--fa fa-bookmark fa-w-12',
                    viewBox: '0 0 384 512'
                }
            }
        },
        lookup: {
            icons: [
                {prefix: 'fas', iconName: 'dice-one'},
                {prefix: 'fas', iconName: 'bookmark'},
                {prefix: 'far', iconName: 'bookmark'}
            ],
            expected: 'multiple'
        },
        'transform-params': {
            icons: {
                'rotated-bookmark': [farBookmark, {
                    transform: {
                        rotate: 90
                    }
                }]
            },
            expected: 'transform'
        },
        'transform-icon': {
            icons: [
                fa.icon(farBookmark, {
                    symbol: 'rotated-bookmark',
                    transform: {
                        rotate: 90
                    }
                })
            ],
            expected: 'transform'
        },
        title: {
            icons: [
                [fasDiceOne, {
                    symbol: 'dice',
                    title: 'Dice'
                }]
            ],
            attributes: {
                dice: {
                    class: 'svg-inline--fa fa-dice-one fa-w-14',
                    viewBox: '0 0 448 512',
                    title: 'Dice'
                }
            }
        }
    }, {
        xmlDeclaration: false,
        license: ''
    });

    it('does not fail with empty symbol', (done) => {
        generateAbstract([{
            tag: 'svg',
            attributes: {},
            children: [{
                tag: 'symbol',
                attributes: {}
            }]
        }]);
        done();
    });

    describe('with options', () =>
        testGenerate({
            default: {},
            'no-license': {
                options: {
                    license: '',
                }
            },
            'no-xml-declaration': {
                options: {
                    xmlDeclaration: false,
                }
            },
            'no-license+no-xml-declaration': {
                options: {
                    license: '',
                    xmlDeclaration: false,
                }
            },
            'custom-license': {
                options: {
                    license: '\nSome License\nCopyright (C) someone else\n',
                }
            }
        }, {}, 'options')
    );

    describe('with errors', () => {
        it('throws error for missing icon', done => {
            expect(() =>
                generate([
                    {prefix: 'fas', iconName: 'smile'}
                ])
            ).to.throw('Failed to generate symbol');
            done();
        });

        it('throws error for duplicate symbol id', done => {
            expect(() =>
                generate([farBookmark, farBookmark])
            ).to.throw('Duplicate symbol id');
            done();
        });

        it('throws error when passing icon without {symbol: true}', done => {
            expect(() =>
                generate([
                    fa.icon(farBookmark)
                ])
            ).to.throw('Did you set {symbol: true}?');
            done();
        });

        it('throws error with unexpected number of root elements', done => {
            const tests: fa.AbstractElement[][] = [
                // No elements
                [],
                // Too many elements
                Array(2).fill({ tag: 'svg' }),
                Array(10).fill({ tag: 'svg' })
            ];

            tests.forEach(abstract => {
                expect(() =>
                    generateAbstract(abstract)
                ).to.throw('Unexpected number of root elements');
            });
            done();
        });

        it('throws error with unexpected root tag', done => {
            expect(() =>
                generateAbstract([{
                    tag: 'html',
                    attributes: {}
                }])
            ).to.throw('Unexpected root tag');
            done();
        });

        it('throws error when SVG has no children', done => {
            expect(() =>
                generateAbstract([{
                    tag: 'svg',
                    attributes: {}
                }])
            ).to.throw('SVG has no children');
            done();
        });

        it('throws error when multiple elements are included in SVG', done => {
            expect(() =>
                generateAbstract([{
                    tag: 'svg',
                    attributes: {},
                    children: Array(2).fill({tag: 'symbol'})
                }])
            ).to.throw('Multiple elements included in SVG');
            done();
        });
    });
});
