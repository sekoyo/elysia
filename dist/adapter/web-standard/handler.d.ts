import type { Context } from '../../context';
import type { AnyLocalHook } from '../../types';
export declare const parseSetCookies: (headers: Headers, setCookie: string[]) => Headers;
export declare function streamResponse(response: Response): AsyncGenerator<string, void, unknown>;
export declare const handleSet: (set: Context["set"]) => void;
export declare const mergeResponseWithSetHeaders: (response: Response, set: Context["set"]) => Response;
export declare const mapResponse: (response: unknown, set: Context["set"], request?: Request) => Response;
export declare const mapEarlyResponse: (response: unknown, set: Context["set"], request?: Request) => Response | undefined;
export declare const mapCompactResponse: (response: unknown, request?: Request) => Response;
export declare const errorToResponse: (error: Error, set?: Context["set"]) => import("undici-types").Response;
export declare const createStaticHandler: (handle: unknown, hooks: Partial<AnyLocalHook>, setHeaders?: Context["set"]["headers"]) => (() => Response) | undefined;
