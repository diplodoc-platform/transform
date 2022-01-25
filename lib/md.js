"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMd = void 0;
const markdown_it_1 = __importDefault(require("markdown-it"));
const initMd = ({ html, linkify, highlight, breaks }) => {
    return new markdown_it_1.default({ html, linkify, highlight, breaks });
};
exports.initMd = initMd;
