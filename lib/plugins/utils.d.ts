import { Logger } from '../log';
import Token from 'markdown-it/lib/token';
export declare type MatchTokenFunction = (tokens: Token[], idx: number) => boolean | null | RegExpMatchArray;
export declare const nestedCloseTokenIdxFactory: (tokenName: string, matchOpenToken: MatchTokenFunction, matchCloseToken: MatchTokenFunction) => (tokens: Token[], idx: number, path: string, log: Logger) => number | null;
export declare const сarriage: string;
