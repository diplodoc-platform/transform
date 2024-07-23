import {applyWideMode} from './wide-mode/apply';

const patch = () => {
    applyWideMode();
};

if (typeof window !== 'undefined') {
    window.patchAfterRender = patch;
}
