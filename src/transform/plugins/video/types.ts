import type Token from 'markdown-it/lib/token';
import type {VideoService} from './const';

export type VideoToken = Token & {
    service: string;
    videoID: string;
};

export type VideoServicesOptions = {
    [_service in VideoService]: {
        width: number | string;
        height: number | string;
    };
} & {
    vine: {
        embed: 'simple' | (string & {});
    };
};

export type Service = {
    csp?: Record<string, string[]>;
    extract(url: string): string;
};

export type Services = Record<VideoService, Service>;

export type VideoFullOptions = VideoServicesOptions & {
    videoUrl: VideoUrlFn;
};

export type VideoPluginOptions = Partial<VideoFullOptions>;

export type VideoUrlFn = (
    service: string,
    videoID: string,
    options: VideoServicesOptions,
) => string;
