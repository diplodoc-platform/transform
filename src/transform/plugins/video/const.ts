import type {VideoFullOptions} from './types';

import {videoUrl} from './utils';

/** Supported services */
export enum VideoService {
    YouTube = 'youtube',
    Vimeo = 'vimeo',
    Vine = 'vine',
    Prezi = 'prezi',
    Osf = 'osf',
    Yandex = 'yandex',
    Vk = 'vk',
    Rutube = 'rutube',
    url = 'url',
}

export type Service = {
    csp?: Record<string, string[]>;
    extract(url: string): string;
};

export type Services = [VideoService, Service][];

export const defaults: VideoFullOptions = {
    videoUrl,
    youtube: {width: 640, height: 390},
    vimeo: {width: 500, height: 281},
    vine: {width: 600, height: 600, embed: 'simple'},
    prezi: {width: 550, height: 400},
    osf: {width: '100%', height: '100%'},
    yandex: {width: 640, height: 390},
    vk: {width: 640, height: 390},
    rutube: {width: 640, height: 390},
    url: {width: 640, height: 390},
};
