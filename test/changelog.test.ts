import transform from '../src/transform';
import path from 'path';
import fs from 'fs';
import changelogPlugin from "../src/transform/plugins/changelog";
import imsize from "../src/transform/plugins/imsize";

describe('Changelog', () => {
    test('Should cut changelogs and return changelogs', async () => {
        expect.assertions(2);

        const data = await fs.promises.readFile(path.join(__dirname, 'data/changelog.md'), 'utf8');

        const {
            result: {html, changelogs: logs},
        } = transform(data, {
            plugins: [changelogPlugin, imsize],
        });

        expect(html).toBe(
            `<h1>Some changelog</h1>\n<p>After changelog</p>\n`,
        );

        expect(logs).toEqual([
            {
                date: '2023-05-10T00:00:00.000Z',
                storyId: 123321,
                title: 'Change log title',
                image: {
                    alt: 'My image',
                    ratio: 0.5625,
                    src: '../src/asd.png',
                },
                description: '<p>Change log payload</p>\n',
            },
        ]);
    });
});
