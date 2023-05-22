import changelogs from '../../src/transform/liquid/changelogs';
import fs from 'fs';
import path from 'path';

describe('Changelogs', () => {
    test('Should cut changelogs and return changelogs', async () => {
        expect.assertions(2);

        const data = await fs.promises.readFile(
            path.join(__dirname, '../data/changelog.md'),
            'utf8',
        );

        const {output, changelogs: logs} = changelogs(data, {});
        expect(output).toBe(`# Some changelog


After changelog
`);
        expect(logs.length).toBe(1);
    });
});
