import {applyWideMode} from './apply';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.addEventListener('load', applyWideMode);
}
