import type {VideoFullOptions} from './types';
import {videoUrl} from './utils';

/** Supported services */
export enum VideoService {
    YouTube = 'youtube',
    Vimeo = 'vimeo',
    Vine = 'vine',
    Prezi = 'prezi',
    Osf = 'osf',
}

export const defaults: VideoFullOptions = {
    url: videoUrl,
    youtube: {width: 640, height: 390},
    vimeo: {width: 500, height: 281},
    vine: {width: 600, height: 600, embed: 'simple'},
    prezi: {width: 550, height: 400},
    osf: {width: '100%', height: '100%'},
};
