import { sha1, sha256, sha384, sha512 } from 'crypto-hash';
import { BadRequest, Forbidden } from 'http-errors';
import andThen from 'ramda/src/andThen';
import converge from 'ramda/src/converge';
import partialRight from 'ramda/src/partialRight';
import pipeWith from 'ramda/src/pipeWith';
import status from 'statuses';
import {
  fetchProgress,
  GetLeetcodeProgressOptions,
  LeetcodeProgress,
  ProgressType,
  renderProgress,
} from './leetcode';

declare global {
  interface CacheStorage {
    default: Cache;
  }
}

const HASH_ALGORITHMS = { sha1, sha256, sha384, sha512 };

export type RequestHandler = (event: FetchEvent) => Promise<Response | void>;

export type HashAlgorithm = keyof typeof HASH_ALGORITHMS;

export interface NormalizeURLOptions {
  progressType?: ProgressType;
}

export interface ProcessHeadersOptions {
  cors?: boolean;
  cacheTTL?: number;
}

export interface ComputeEtagOptions {
  hashAlgorithm?: HashAlgorithm;
}

export interface PrepareOptions extends NormalizeURLOptions {
  userlist?: Set<string>;
}

export interface HandleGetOptions
  extends GetLeetcodeProgressOptions,
    NormalizeURLOptions,
    ProcessHeadersOptions,
    ComputeEtagOptions,
    PrepareOptions {
  userlist?: Set<string>;
  cacheName?: string;
}

export interface HandlerContext {
  url: string;
  username: string;
  progressType: ProgressType;
  theme?: string;
}

export type CacheMatch = (
  url: string,
  headers: Headers,
) => Promise<Response | undefined>;
export type CachePut = (response: Response) => Promise<void>;

/**
 * @todo Hotfix the typing of R.pipeWith which currently
 * can only accept unary functions.
 *
 * Affected keywords:
 * - ProcessResponse
 * - UnaryFetchProgress
 * - processResponse
 */
export type ProcessResponse = (
  username: string,
  progressType: ProgressType,
) => Promise<Response>;

export type UnaryFetchProgress = (
  username: string,
) => Promise<LeetcodeProgress>;

/**
 * Leetcode: The username must contain only letters, numbers, hyphens
 * and underscores.
 */
export function validateUsername(username: unknown): username is string {
  return typeof username === 'string' && /[a-zA-Z-_]+/.test(username);
}

export function validateProgressType(
  progressType: unknown,
): progressType is ProgressType {
  return progressType === 'global' || progressType === 'session';
}

export function normalizeURL(
  url: string,
  { progressType = 'global' }: NormalizeURLOptions = {},
): URL {
  const urlObj = new URL(url);
  urlObj.hash = '';
  if (!urlObj.searchParams.has('progress-type')) {
    urlObj.searchParams.set('progress-type', progressType);
  }
  return urlObj;
}

export function prepare(
  request: Request,
  { progressType, userlist }: PrepareOptions = {},
): HandlerContext {
  const url = normalizeURL(request.url, { progressType });
  const username = url.searchParams.get('username');
  const progType = url.searchParams.get('progress-type');
  const theme = url.searchParams.get('theme') ?? undefined;
  if (!validateUsername(username) || !validateProgressType(progType)) {
    throw new BadRequest();
  }
  if (userlist && !userlist.has(username)) {
    throw new Forbidden();
  }
  return { url: url.toString(), username, progressType: progType, theme };
}

export function useCache(
  cache: Cache | Promise<Cache>,
): [CacheMatch, CachePut] {
  let request: Request;
  async function match(url: string, headers: Headers) {
    const _cache = await cache;
    request = new Request(url, { headers });
    const cacheResponse = await _cache.match(request);
    if (cacheResponse) {
      return cacheResponse;
    }
  }
  async function put(response: Response) {
    const _cache = await cache;
    await _cache.put(request, response);
  }
  return [match, put];
}

export function createResponse(content: string): Response {
  return new Response(content, {
    status: 200,
    statusText: status(200) as string,
    headers: {
      'Content-Length': String(content.length),
    },
  });
}

export async function computeEtag(
  content: string,
  { hashAlgorithm = 'sha1' }: { hashAlgorithm?: HashAlgorithm } = {},
): Promise<string> {
  return hashAlgorithm
    ? await HASH_ALGORITHMS[hashAlgorithm](content, { outputFormat: 'hex' })
    : '';
}

export async function processEtagHeader(
  response: Response,
  etagPromise: Promise<string>,
): Promise<Response> {
  const etag = await etagPromise;
  if (etag) {
    response.headers.set('ETag', etag);
  }
  return response;
}

export function processHeaders(
  response: Response,
  { cors, cacheTTL = 300000 }: ProcessHeadersOptions = {},
): Response {
  const maxage = Math.round(cacheTTL / 1000);
  const now = new Date();
  const expires = new Date(now.getTime() + cacheTTL);

  response.headers.set('Content-Type', 'image/svg+xml');
  response.headers.set('Cache-Control', `public, max-age=${maxage}`);
  response.headers.set('Last-Modified', now.toUTCString());
  response.headers.set('Expires', expires.toUTCString());

  if (cors) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  return response;
}

export function createGetHandler({
  cacheName,
  cacheTTL,
  cors,
  hashAlgorithm,
  leetcodeGraphqlUrl,
  progressType,
  userlist,
  fetch,
}: HandleGetOptions = {}): RequestHandler {
  const boundPrepare = partialRight(prepare, [{ userlist, progressType }]);
  const processResponse = (theme = 'default') =>
    pipeWith(andThen)([
      partialRight(fetchProgress, [
        { leetcodeGraphqlUrl, fetch },
      ]) as UnaryFetchProgress,
      renderProgress(theme),
      converge(processEtagHeader, [
        createResponse,
        partialRight(computeEtag, [{ hashAlgorithm }]),
      ]),
      partialRight(processHeaders, [{ cors, cacheTTL }]),
    ]) as unknown as ProcessResponse;

  return async function handleGet(event: FetchEvent): Promise<Response> {
    const cache =
      cacheName === 'default'
        ? caches.default
        : cacheName
        ? caches.open(cacheName)
        : undefined;

    const [matchCache, putCache] = cache ? useCache(cache) : [];
    const { url, username, progressType, theme } = boundPrepare(event.request);
    let response = await matchCache?.(url, event.request.headers);
    if (response) return response;
    response = await processResponse(theme)(username, progressType);
    if (putCache) event.waitUntil(putCache(response.clone()));
    return response;
  };
}
