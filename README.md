# Cloudflare Worker LeetCode Progress

> Generate LeetCode progress as a SVG deployed on Cloudflare Workers.

## Usage

```js

const createHandler = require('@momocow/cloudflare-worker-leetcode-progress').default
const handleRequest = createHandler({ /* options */ });

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event) ?? new Response('', { status: 405 }));
});
```

> Remember to configure your `wrangler.toml` to build with webpack.
>
> ```toml
> type = "webpack"
> ``` 

## Options
- `cacheName`: string = undefined
  > If it is `undefined`, no caches will be used. If it's `"default"`, the default cache will be used; otherwise a new cache is opened using the provided name. See [`await caches.open(name)`](https://developers.cloudflare.com/workers/runtime-apis/cache#accessing-cache).
- `cacheTTL`: number = 300000 (in ms)
  > The value is used to generate the max age of `Cache-Control` and compute the `Expires` time.
- `cors`: boolean = false
  > Allow CORS or not. If set, CORS headers will be generated and OPTIONS method will be handled.
- `hashAlgorithm`: "sha1" | "sha256" | "sha384" | "sha512" = "sha1"
  > Hash algorithm to use to generate ETag.
- `leetcodeGraphqlUrl`: string = "https://leetcode.com/graphql"
  > LeetCode GraphQL endpoint.
- `progressType`: "global" | "session" = "global"
  > Type of LeetCode progress to display. If it's "session", the statistics of the current active session is fetched.
  > 
  > This option is set for the default progress type; however, at each request, ones can provided `progress-type` parameter in the query string to change the value.
- `userlist`: Set&lt;string&gt; = undefined
  > Access control for your Worker. If provided, only usernames appear in the set is allowed to generate the progress; otherwise, 403 forbidden is responsed.
  >  
  > Note that leave it undefined means access control disabled, every is allowed to access the Worker.
- `fetch`: typeof [fetch](https://developers.cloudflare.com/workers/runtime-apis/fetch) = fetch
  > This option is passed to `graphql-request` to avoid using XMLHttpRequest (No such API in Worker Runtime).

## Query String Parameters
- `username`: string
- `progress-type`: "global" | "session"
