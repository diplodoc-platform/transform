import type Token from 'markdown-it/lib/token';
import type {VideoService} from './const';

export type VideoToken = Token & {
    service: string;
    videoID: string;
};

export type VideoServicesOptions = {
    [VideoService.YouTube]: {width: number; height: number};
    [VideoService.Vimeo]: {width: number; height: number};
    [VideoService.Vine]: {width: number; height: number; embed: 'simple' | string};
    [VideoService.Prezi]: {width: number; height: number};
    [VideoService.Osf]: {width: string; height: string};
};

export type VideoFullOptions = VideoServicesOptions & {
    url: VideoUrlFn;
};

export type VideoPluginOptions = Partial<VideoFullOptions>;

export type VideoUrlFn = (
    service: string,
    videoID: string,
    options: VideoServicesOptions,
) => string;
