import type {VideoService} from './const';
import type {Services} from './types';

const ytRegex = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
export function youtubeParser(url: string) {
    const match = url.match(ytRegex);
    return match && match[7].length === 11 ? match[7] : url;
}

const vimeoRegex =
    /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
export function vimeoParser(url: string) {
    const match = url.match(vimeoRegex);
    return match && typeof match[3] === 'string' ? match[3] : url;
}

const vineRegex = /^http(?:s?):\/\/(?:www\.)?vine\.co\/v\/([a-zA-Z0-9]{1,13}).*/;
export function vineParser(url: string) {
    const match = url.match(vineRegex);
    return match && match[1].length === 11 ? match[1] : url;
}

const preziRegex = /^https:\/\/prezi.com\/(.[^/]+)/;
export function preziParser(url: string) {
    const match = url.match(preziRegex);
    return match ? match[1] : url;
}

// TODO: Write regex for staging and local servers.
const mfrRegex =
    /^http(?:s?):\/\/(?:www\.)?mfr\.osf\.io\/render\?url=http(?:s?):\/\/osf\.io\/([a-zA-Z0-9]{1,5})\/\?action=download/;
export function mfrParser(url: string) {
    const match = url.match(mfrRegex);
    return match ? match[1] : url;
}

const yandexRegex = /^https:\/\/runtime.video.cloud.yandex.net\/player\/video\/([a-zA-Z0-9]+)/;
export function yandexParser(url: string) {
    const match = url.match(yandexRegex);
    return match ? match[1] : url;
}

const vkRegex = /^https:\/\/vk\.com\/video_ext\.php\?(.*)/;
export function vkParser(url: string) {
    const match = url.match(vkRegex);
    if (match) {
        const searchParams: URLSearchParams = new URLSearchParams(match[1]);
        const encodedUrl: string[] = [];
        searchParams.forEach((value, key) => {
            encodedUrl.push(`${key}=${encodeURIComponent(value)}`);
        });
        return encodedUrl.join('&');
    }
    return url;
}

const rutubeRegex = /^https:\/\/rutube\.ru\/video\/([a-zA-Z0-9]+)\/?/;
export function rutubeParser(url: string) {
    const match = url.match(rutubeRegex);
    return match ? match[1] : url;
}

const urlParser = (url: string) => url;

const supportedServices = {
    osf: {
        extract: mfrParser,
    },
    prezi: {
        extract: preziParser,
    },
    vimeo: {
        extract: vimeoParser,
    },
    vine: {
        extract: vineParser,
    },
    yandex: {
        extract: yandexParser,
    },
    youtube: {
        extract: youtubeParser,
    },
    vk: {
        extract: vkParser,
        csp: {
            'frame-src': ['https://vk.com/', 'https://login.vk.com/'],
        },
    },
    rutube: {
        extract: rutubeParser,
        csp: {
            'frame-src': ['https://rutube.ru/play/embed/'],
        },
    },
    url: {
        extract: urlParser,
    },
} as Services;

export function parseVideoUrl(service: string, url: string) {
    let videoID = '';
    const normalizedService = service.toLowerCase();
    const parsed = supportedServices[normalizedService as VideoService];

    if (!parsed) {
        return false;
    }

    const {extract, csp} = parsed;

    videoID = extract(url);

    // If the videoID field is empty, regex currently make it the close parenthesis.
    if (videoID === ')') {
        videoID = '';
    }

    return [videoID, csp] as const;
}
