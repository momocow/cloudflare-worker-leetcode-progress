import { isHttpError } from 'http-errors';
import status from 'statuses';
import { createGetHandler, HandleGetOptions, RequestHandler } from './handler';

export function handleOptions(event: FetchEvent): Response {
  const headers = event.request.headers;
  if (
    headers.has('Origin') &&
    headers.has('Access-Control-Request-Method') &&
    headers.has('Access-Control-Request-Headers') !== null
  ) {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Headers': headers.get(
          'Access-Control-Request-Headers',
        )!,
      },
    });
  } else {
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, OPTIONS',
      },
    });
  }
}

export function handleClientError(err: Error): Response {
  if (isHttpError(err) && err.expose) {
    return new Response(err.message, {
      status: err.status,
      statusText: status(err.status) as string,
      headers: err.headers,
    });
  }
  throw err;
}

/**
 * @example
 * const handler = createHandler()
 *
 * addEventListener('fetch', (event) => {
 *  event.respondWith(handler(event) ?? new Response('', { status: 405 }));
 * });
 */
export default function createHandler(
  options: HandleGetOptions = {},
): RequestHandler {
  const handleGet = createGetHandler(options);
  return async function (event: FetchEvent): Promise<Response | void> {
    try {
      if (options.cors && event.request.method === 'OPTIONS') {
        return handleOptions(event);
      } else if (event.request.method === 'GET') {
        return await handleGet(event);
      }
    } catch (err) {
      return handleClientError(err);
    }
  };
}
