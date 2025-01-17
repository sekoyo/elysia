import { type stat as Stat } from 'fs/promises';
import type { MaybePromise } from '../types';
export declare const mime: {
    readonly aac: "audio/aac";
    readonly abw: "application/x-abiword";
    readonly ai: "application/postscript";
    readonly arc: "application/octet-stream";
    readonly avi: "video/x-msvideo";
    readonly azw: "application/vnd.amazon.ebook";
    readonly bin: "application/octet-stream";
    readonly bz: "application/x-bzip";
    readonly bz2: "application/x-bzip2";
    readonly csh: "application/x-csh";
    readonly css: "text/css";
    readonly csv: "text/csv";
    readonly doc: "application/msword";
    readonly dll: "application/octet-stream";
    readonly eot: "application/vnd.ms-fontobject";
    readonly epub: "application/epub+zip";
    readonly gif: "image/gif";
    readonly htm: "text/html";
    readonly html: "text/html";
    readonly ico: "image/x-icon";
    readonly ics: "text/calendar";
    readonly jar: "application/java-archive";
    readonly jpeg: "image/jpeg";
    readonly jpg: "image/jpeg";
    readonly js: "application/javascript";
    readonly json: "application/json";
    readonly mid: "audio/midi";
    readonly midi: "audio/midi";
    readonly mp2: "audio/mpeg";
    readonly mp3: "audio/mpeg";
    readonly mp4: "video/mp4";
    readonly mpa: "video/mpeg";
    readonly mpe: "video/mpeg";
    readonly mpeg: "video/mpeg";
    readonly mpkg: "application/vnd.apple.installer+xml";
    readonly odp: "application/vnd.oasis.opendocument.presentation";
    readonly ods: "application/vnd.oasis.opendocument.spreadsheet";
    readonly odt: "application/vnd.oasis.opendocument.text";
    readonly oga: "audio/ogg";
    readonly ogv: "video/ogg";
    readonly ogx: "application/ogg";
    readonly otf: "font/otf";
    readonly png: "image/png";
    readonly pdf: "application/pdf";
    readonly ppt: "application/vnd.ms-powerpoint";
    readonly rar: "application/x-rar-compressed";
    readonly rtf: "application/rtf";
    readonly sh: "application/x-sh";
    readonly svg: "image/svg+xml";
    readonly swf: "application/x-shockwave-flash";
    readonly tar: "application/x-tar";
    readonly tif: "image/tiff";
    readonly tiff: "image/tiff";
    readonly ts: "application/typescript";
    readonly ttf: "font/ttf";
    readonly txt: "text/plain";
    readonly vsd: "application/vnd.visio";
    readonly wav: "audio/x-wav";
    readonly weba: "audio/webm";
    readonly webm: "video/webm";
    readonly webp: "image/webp";
    readonly woff: "font/woff";
    readonly woff2: "font/woff2";
    readonly xhtml: "application/xhtml+xml";
    readonly xls: "application/vnd.ms-excel";
    readonly xlsx: "application/vnd.ms-excel";
    readonly xlsx_OLD: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    readonly xml: "application/xml";
    readonly xul: "application/vnd.mozilla.xul+xml";
    readonly zip: "application/zip";
    readonly '3gp': "video/3gpp";
    readonly '3gp_DOES_NOT_CONTAIN_VIDEO': "audio/3gpp";
    readonly '3gp2': "video/3gpp2";
    readonly '3gp2_DOES_NOT_CONTAIN_VIDEO': "audio/3gpp2";
    readonly '7z': "application/x-7z-compressed";
};
export declare const getFileExtension: (path: string) => string;
export declare const file: (path: string) => ElysiaFile;
export declare class ElysiaFile {
    path: string;
    readonly value: MaybePromise<unknown>;
    readonly stats: ReturnType<typeof Stat> | undefined;
    constructor(path: string);
    get type(): any;
    get length(): number | Promise<number | bigint>;
}
