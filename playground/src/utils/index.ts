import {EditorType} from '../App';
import data from '../PageConstructorEditor/data.json';
import initialMarkup from '../SplitViewEditor/mdContent';

function persist(input: string, query = 'input') {
    try {
        const current = new URL(location.toString());
        current.searchParams.set(query, encodeURI(input) ?? '');

        // @ts-expect-error
        history.pushState(null, null, current);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
    }
}

function deleteQuery(query) {
    try {
        const current = new URL(location.toString());
        current.searchParams.delete(query);

        // @ts-expect-error
        history.pushState(null, null, current);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
    }
}

function restore(query = 'input') {
    try {
        const search = new URLSearchParams(window.location.search);
        let input = search.get(query);

        if (input?.length) {
            input = decodeURI(input);
        } else {
            return '';
        }

        return input;
    } catch (err) {
        return '';
    }
}

function prefill() {
    const search = new URLSearchParams(window.location.search);

    if (search.get('prefill') === 'true') {
        const mode = search.get('mode');
        return mode === EditorType.PC ? data : initialMarkup;
    }

    return restore();
}

function deleteElementById(data, idToRemove) {
    return data
        .map((subArray) => {
            return subArray.filter((element) => element.id !== idToRemove);
        })
        .filter((subArray) => subArray.length > 0);
}

export {persist, restore, prefill, deleteQuery, deleteElementById};
