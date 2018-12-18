const conditions = require('./index');

function callPlugin(tokens, opts) {
    const state = {
        tokens
    };

    const fakeMd = {
        core: {
            ruler: {
                push: (name, cb) => cb(state)
            }
        }
    };

    conditions(fakeMd, opts);

    return state.tokens;
}

describe('Conditions', () => {
    describe('location', () => {
        describe('Inline text', () => {
            test('Should works for if only', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should works for if-else: positive', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should works for if-else: negative', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should works for if-elsif', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if yandex %} Inline if {% elsif user %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if yandex %} Inline if {% elsif user %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });
        });

        describe('Blocks', () => {
            test('Should works for if only', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block before if.'
                                }
                            ],
                            'content': 'Block before if.'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if user %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block in if'
                                }
                            ],
                            'content': 'Block in if'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block after if.'
                                }
                            ],
                            'content': 'Block after if.'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        }
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block before if.'
                            }
                        ],
                        'content': 'Block before if.'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block in if'
                            }
                        ],
                        'content': 'Block in if'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block after if.'
                            }
                        ],
                        'content': 'Block after if.'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ]);
            });

            test('Should works for if-else: positive', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block before if.'
                                }
                            ],
                            'content': 'Block before if.'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if user %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block in if'
                                }
                            ],
                            'content': 'Block in if'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% else %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block in else'
                                }
                            ],
                            'content': 'Block in else'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block after if.'
                                }
                            ],
                            'content': 'Block after if.'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        }
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block before if.'
                            }
                        ],
                        'content': 'Block before if.'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block in if'
                            }
                        ],
                        'content': 'Block in if'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block after if.'
                            }
                        ],
                        'content': 'Block after if.'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ]);
            });

            test('Should works for if-else: negative', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block before if.'
                                }
                            ],
                            'content': 'Block before if.'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if yandex %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block in if'
                                }
                            ],
                            'content': 'Block in if'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% else %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block in else'
                                }
                            ],
                            'content': 'Block in else'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block after if.'
                                }
                            ],
                            'content': 'Block after if.'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        }
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block before if.'
                            }
                        ],
                        'content': 'Block before if.'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block in else'
                            }
                        ],
                        'content': 'Block in else'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block after if.'
                            }
                        ],
                        'content': 'Block after if.'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ]);
            });

            test('Should works for if-elsif', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block before if.'
                                }
                            ],
                            'content': 'Block before if.'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if yandex %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block in if'
                                }
                            ],
                            'content': 'Block in if'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% elsif user %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block in else'
                                }
                            ],
                            'content': 'Block in else'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Block after if.'
                                }
                            ],
                            'content': 'Block after if.'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        }
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block before if.'
                            }
                        ],
                        'content': 'Block before if.'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block in else'
                            }
                        ],
                        'content': 'Block in else'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Block after if.'
                            }
                        ],
                        'content': 'Block after if.'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ]);
            });
        });

        test('Should\'t works for code', () => {
            expect(
                callPlugin([
                    {
                        'type': 'fence',
                        'tag': 'code',
                        'children': null,
                        'content': ' Prefix {% if yandex %} Inline if {% endif %} Postfix.\n'
                    }
                ], {vars: {user: {name: 'Alice'}}})
            ).toEqual([
                {
                    'type': 'fence',
                    'tag': 'code',
                    'children': null,
                    'content': ' Prefix {% if yandex %} Inline if {% endif %} Postfix.\n'
                }
            ]);
        });
    });

    describe('Conditions', () => {
        describe('Positive', () => {
            test('Should support single value', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support ==', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.name == \'Alice\' %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.name == \'Alice\' %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support !=', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.name != \'Bob\' %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.name != \'Bob\' %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support >=', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age >= 18 %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age >= 18 %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 18}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support >', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age > 18 %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age > 18 %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 21}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support <=', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age <= 18 %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age <= 18 %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 18}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support <', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age < 18 %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age < 18 %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 1}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support \'and\'', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user and user.age >= 18 %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user and user.age >= 18 %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 18}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support \'or\'', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 21}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Inline if Postfix'
                        }],
                        'content': 'Prefix Inline if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });
        });

        describe('Negaive', () => {
            test('Should support single value', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if yandex %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support ==', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.name == \'Alice\' %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.name == \'Alice\' %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Bob'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support !=', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.name != \'Bob\' %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.name != \'Bob\' %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Bob'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support >=', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 1}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support >', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age > 18 %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age > 18 %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 1}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support <=', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age <= 18 %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age <= 18 %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 21}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support <', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age < 18 %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age < 18 %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 21}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support \'and\'', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user and user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user and user.age >= 18 %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 1}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support \'or\'', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% else %} else {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user.age < 18 or user.age >= 21 %} Inline if {% else %} else {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {age: 20}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix else Postfix'
                        }],
                        'content': 'Prefix else Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });
        });
    });

    describe('Nested conditions', () => {
        describe('Inline text', () => {
            test('Should support nested if\'s: positive', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if {% endif %} After nested if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if {% endif %} After nested if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Before nested if nested if After nested if Postfix'
                        }],
                        'content': 'Prefix Before nested if nested if After nested if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });

            test('Should support nested if\'s: negative', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'content': ''
                        }, {
                            'type': 'inline',
                            'children': [{
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if {% endif %} After nested if {% endif %} Postfix'
                            }],
                            'content': 'Prefix {% if user %} Before nested if {% if user.name == \'Alice\' %} nested if {% endif %} After nested if {% endif %} Postfix'
                        }, {
                            'type': 'paragraph_close',
                            'content': ''
                        }],
                    {vars: {user: {name: 'Bob'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'content': ''
                    }, {
                        'type': 'inline',
                        'children': [{
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Before nested if  After nested if Postfix'
                        }],
                        'content': 'Prefix Before nested if  After nested if Postfix'
                    }, {
                        'type': 'paragraph_close',
                        'content': ''
                    }
                ]);
            });
        });

        describe('Blocks', () => {
            test('Should support nested if\'s: positive', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Prefix'
                                }
                            ],
                            'content': 'Prefix'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if user %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Before nested'
                                }
                            ],
                            'content': 'Before nested'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if user.name == \'Alice\' %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'nested if'
                                }
                            ],
                            'content': 'nested if'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'After nested'
                                }
                            ],
                            'content': 'After nested'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Postfix'
                                }
                            ],
                            'content': 'Postfix'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        }
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix'
                            }
                        ],
                        'content': 'Prefix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Before nested'
                            }
                        ],
                        'content': 'Before nested'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'nested if'
                            }
                        ],
                        'content': 'nested if'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'After nested'
                            }
                        ],
                        'content': 'After nested'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Postfix'
                            }
                        ],
                        'content': 'Postfix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ]);
            });

            test('Should support nested if\'s: negative', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Prefix'
                                }
                            ],
                            'content': 'Prefix'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if user %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Before nested'
                                }
                            ],
                            'content': 'Before nested'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if user.name == \'Alice\' %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'nested if'
                                }
                            ],
                            'content': 'nested if'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'After nested'
                                }
                            ],
                            'content': 'After nested'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Postfix'
                                }
                            ],
                            'content': 'Postfix'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        }
                    ],
                    {vars: {user: {name: 'Bob'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix'
                            }
                        ],
                        'content': 'Prefix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Before nested'
                            }
                        ],
                        'content': 'Before nested'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'After nested'
                            }
                        ],
                        'content': 'After nested'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Postfix'
                            }
                        ],
                        'content': 'Postfix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ]);
            });

            test('Should support inline if in block if', () => {
                expect(
                    callPlugin([
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Prefix'
                                }
                            ],
                            'content': 'Prefix'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% if user %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Before nested if {% if user.name == \'Alice\' %} Nested if {% endif %} After nested if'
                                }
                            ],
                            'content': 'Before nested if {% if user.name == \'Alice\' %} Nested if {% endif %} After nested if'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': ''
                                }
                            ],
                            'content': '{% endif %}'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'paragraph_open',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        },
                        {
                            'type': 'inline',
                            'tag': '',
                            'children': [
                                {
                                    'type': 'text',
                                    'tag': '',
                                    'children': null,
                                    'content': 'Postfix'
                                }
                            ],
                            'content': 'Postfix'
                        },
                        {
                            'type': 'paragraph_close',
                            'tag': 'p',
                            'children': null,
                            'content': ''
                        }
                    ],
                    {vars: {user: {name: 'Alice'}}}
                    )
                ).toEqual([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix'
                            }
                        ],
                        'content': 'Prefix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Before nested if Nested if After nested if'
                            }
                        ],
                        'content': 'Before nested if Nested if After nested if'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Postfix'
                            }
                        ],
                        'content': 'Postfix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ]);
            });
        });
    });

    describe('Chail else\'s', () => {
        test('Should supported in inline text', () => {
            expect(
                callPlugin([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix {% if yandex %} if {% elsif user.name == \'Bob\' %} Bob {% elsif user.name == \'Alice\' %} Alice {% endif %} Postfix'
                            }
                        ],
                        'content': 'Prefix {% if yandex %} if {% elsif user.name == \'Bob\' %} Bob {% elsif user.name == \'Alice\' %} Alice {% endif %} Postfix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ],
                {vars: {user: {name: 'Alice'}}})
            ).toEqual([
                {
                    'type': 'paragraph_open',
                    'tag': 'p',
                    'children': null,
                    'content': ''
                },
                {
                    'type': 'inline',
                    'tag': '',
                    'children': [
                        {
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix Alice Postfix'
                        }
                    ],
                    'content': 'Prefix Alice Postfix'
                },
                {
                    'type': 'paragraph_close',
                    'tag': 'p',
                    'children': null,
                    'content': ''
                }
            ]);
        });

        test('Should supported in blocks', () => {
            expect(
                callPlugin([
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Prefix'
                            }
                        ],
                        'content': 'Prefix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': ''
                            }
                        ],
                        'content': '{% if yandex %}'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'If'
                            }
                        ],
                        'content': 'If'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': ''
                            }
                        ],
                        'content': '{% elsif user.name == \'Bob\' %}'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Bob'
                            }
                        ],
                        'content': 'Bob'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': ''
                            }
                        ],
                        'content': '{% elsif user.name == \'Alice\' %}'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Alice'
                            }
                        ],
                        'content': 'Alice'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': ''
                            }
                        ],
                        'content': '{% endif %}'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'paragraph_open',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    },
                    {
                        'type': 'inline',
                        'tag': '',
                        'children': [
                            {
                                'type': 'text',
                                'tag': '',
                                'children': null,
                                'content': 'Postfix'
                            }
                        ],
                        'content': 'Postfix'
                    },
                    {
                        'type': 'paragraph_close',
                        'tag': 'p',
                        'children': null,
                        'content': ''
                    }
                ],
                {vars: {user: {name: 'Alice'}}})
            ).toEqual([
                {
                    'type': 'paragraph_open',
                    'tag': 'p',
                    'children': null,
                    'content': ''
                },
                {
                    'type': 'inline',
                    'tag': '',
                    'children': [
                        {
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Prefix'
                        }
                    ],
                    'content': 'Prefix'
                },
                {
                    'type': 'paragraph_close',
                    'tag': 'p',
                    'children': null,
                    'content': ''
                },
                {
                    'type': 'paragraph_open',
                    'tag': 'p',
                    'children': null,
                    'content': ''
                },
                {
                    'type': 'inline',
                    'tag': '',
                    'children': [
                        {
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Alice'
                        }
                    ],
                    'content': 'Alice'
                },
                {
                    'type': 'paragraph_close',
                    'tag': 'p',
                    'children': null,
                    'content': ''
                },
                {
                    'type': 'paragraph_open',
                    'tag': 'p',
                    'children': null,
                    'content': ''
                },
                {
                    'type': 'inline',
                    'tag': '',
                    'children': [
                        {
                            'type': 'text',
                            'tag': '',
                            'children': null,
                            'content': 'Postfix'
                        }
                    ],
                    'content': 'Postfix'
                },
                {
                    'type': 'paragraph_close',
                    'tag': 'p',
                    'children': null,
                    'content': ''
                }
            ]);
        });
    });
});
