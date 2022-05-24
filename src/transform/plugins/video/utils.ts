import type {VideoUrlFn} from './types';

export const videoUrl: VideoUrlFn = (service, videoID, options) => {
    switch (service) {
        case 'youtube':
            return 'https://www.youtube.com/embed/' + videoID;
        case 'vimeo':
            return 'https://player.vimeo.com/video/' + videoID;
        case 'vine':
            return 'https://vine.co/v/' + videoID + '/embed/' + options.vine.embed;
        case 'prezi':
            return (
                'https://prezi.com/embed/' +
                videoID +
                '/?bgcolor=ffffff&amp;lock_to_path=0&amp;autoplay=0&amp;autohide_ctrls=0&amp;' +
                'landing_data=bHVZZmNaNDBIWnNjdEVENDRhZDFNZGNIUE43MHdLNWpsdFJLb2ZHanI5N1lQVHkxSHFxazZ0UUNCRHloSXZROHh3PT0&amp;' +
                'landing_sign=1kD6c0N6aYpMUS0wxnQjxzSqZlEB8qNFdxtdjYhwSuI'
            );
        case 'osf':
            return 'https://mfr.osf.io/render?url=https://osf.io/' + videoID + '/?action=download';
        default:
            return service;
    }
};
