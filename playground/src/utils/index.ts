import {EditorType} from "src/App";
import data from 'src/PageConstructorEditor/data.json';
import initialMarkup from 'src/SplitViewEditor/mdContent';

function persist(input: string, query = 'input') {
  try {
    const current = new URL(location.toString());
    current.searchParams.set(query, encodeURI(input) ?? '');

    history.pushState(null, null, current);
  } catch (err) {
    console.error(err);
  }
}

function deleteQuery(query) {
  try {
    const current = new URL(location.toString());
    current.searchParams.delete(query);

    history.pushState(null, null, current);
  } catch (err) {
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

  if(search.get('prefill') === 'true'){
    const mode = search.get('mode')
    return mode === EditorType.PC ? data : initialMarkup
  }

  return restore();
}

function deleteElementById(data, idToRemove) {
  return data.map(subArray => {
    return subArray.filter(element => element.id !== idToRemove);
  }).filter(subArray => subArray.length > 0);
}


export {persist, restore, prefill, deleteQuery, deleteElementById};
