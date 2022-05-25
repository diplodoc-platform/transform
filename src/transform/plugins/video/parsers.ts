import {VideoService} from './const';

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

export function parseVideoUrl(service: string, url: string): string | false {
    let videoID = '';

    switch (service.toLowerCase()) {
        case VideoService.YouTube:
            videoID = youtubeParser(url);
            break;
        case VideoService.Vimeo:
            videoID = vimeoParser(url);
            break;
        case VideoService.Vine:
            videoID = vineParser(url);
            break;
        case VideoService.Prezi:
            videoID = preziParser(url);
            break;
        case VideoService.Osf:
            videoID = mfrParser(url);
            break;
        default:
            return false;
    }

    // If the videoID field is empty, regex currently make it the close parenthesis.
    if (videoID === ')') {
        videoID = '';
    }

    return videoID;
}
