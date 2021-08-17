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
