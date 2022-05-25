// Process @[youtube](youtubeVideoID)
// Process @[vimeo](vimeoVideoID)
// Process @[vine](vineVideoID)
// Process @[prezi](preziID)
// Process @[osf](guid)

import type MarkdownIt from 'markdown-it';
import type {PluginWithOptions} from 'markdown-it';
import type ParserInline from 'markdown-it/lib/parser_inline';
import type Renderer from 'markdown-it/lib/renderer';

import type {VideoFullOptions, VideoPluginOptions, VideoToken} from './types';
import {parseVideoUrl} from './parsers';
import {defaults, VideoService} from './const';

// eslint-disable-next-line valid-jsdoc
/**
 * Video plugin for markdown-it.
 * Forked from https://github.com/CenterForOpenScience/markdown-it-video/tree/0.6.3
 */
const video: PluginWithOptions<VideoPluginOptions> = (md, options) => {
    const theOptions: VideoFullOptions = {...defaults, ...options};
    const theMd = md;

    theMd.renderer.rules.video = tokenizeVideo(theMd, theOptions);
    theMd.inline.ruler.before('emphasis', 'video', videoEmbed(theMd, theOptions));
};

function tokenizeVideo(md: MarkdownIt, options: VideoFullOptions): Renderer.RenderRule {
    return (tokens, idx) => {
        const videoID = md.utils.escapeHtml((tokens[idx] as VideoToken).videoID);
        const service = md.utils.escapeHtml((tokens[idx] as VideoToken).service).toLowerCase();
        const checkUrl =
            /http(?:s?):\/\/(?:www\.)?[a-zA-Z0-9-:.]{1,}\/render(?:\/)?[a-zA-Z0-9.&;?=:%]{1,}url=http(?:s?):\/\/[a-zA-Z0-9 -:.]{1,}\/[a-zA-Z0-9]{1,5}\/\?[a-zA-Z0-9.=:%]{1,}/;
        let num;

        if (service === VideoService.Osf && videoID) {
            num = Math.random() * 0x10000;

            if (videoID.match(checkUrl)) {
                return (
                    '<div id="' +
                    num +
                    '" class="mfr mfr-file"></div><script>' +
                    '$(document).ready(function () {new mfr.Render("' +
                    num +
                    '", "' +
                    videoID +
                    '");' +
                    '    }); </script>'
                );
            }
            return (
                '<div id="' +
                num +
                '" class="mfr mfr-file"></div><script>' +
                '$(document).ready(function () {new mfr.Render("' +
                num +
                '", "https://mfr.osf.io/' +
                'render?url=https://osf.io/' +
                videoID +
                '/?action=download%26mode=render");' +
                '    }); </script>'
            );
        }

        const {width, height} = options[service as VideoService];

        return videoID === ''
            ? ''
            : '<div class="embed-responsive embed-responsive-16by9"><iframe class="embed-responsive-item ' +
                  service +
                  '-player" type="text/html" width="' +
                  width +
                  '" height="' +
                  height +
                  '" src="' +
                  options.url(service, videoID, options) +
                  '" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div>';
    };
}

const EMBED_REGEX = /@\[([a-zA-Z].+)]\([\s]*(.*?)[\s]*[)]/im;
function videoEmbed(md: MarkdownIt, _options: VideoFullOptions): ParserInline.RuleInline {
    return (state, silent) => {
        const theState = state;
        const oldPos = state.pos;

        if (
            state.src.charCodeAt(oldPos) !== 0x40 /* @ */ ||
            state.src.charCodeAt(oldPos + 1) !== 0x5b /* [ */
        ) {
            return false;
        }

        const match = EMBED_REGEX.exec(state.src.slice(state.pos, state.src.length));

        if (!match || match.length < 3) {
            return false;
        }

        const service = match[1];
        const videoID = parseVideoUrl(service, match[2]);

        if (videoID === false) {
            return false;
        }

        const serviceStart = oldPos + 2;
        const serviceEnd = md.helpers.parseLinkLabel(state, oldPos + 1, false);

        //
        // We found the end of the link, and know for a fact it's a valid link;
        // so all that's left to do is to call tokenizer.
        //
        if (!silent) {
            theState.pos = serviceStart;
            // @ts-expect-error
            theState.service = theState.src.slice(serviceStart, serviceEnd);
            const newState = new theState.md.inline.State(service, theState.md, theState.env, []);
            newState.md.inline.tokenize(newState);

            const token = theState.push('video', '', 0);
            (token as VideoToken).videoID = videoID;
            (token as VideoToken).service = service;
            token.level = theState.level;
        }

        theState.pos += theState.src.indexOf(')', theState.pos);
        return true;
    };
}

export = video;
