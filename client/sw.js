/*
Until this issue is resolved, this Service Worker will be in JS instead of TS.
https://github.com/Microsoft/TypeScript/issues/11781
*/

const cacheName = 'my-game-cache-v1';

self.addEventListener('install', async (event) => {
    // first, fetch /fileList.txt
    const fileList = await fetch('/fileList.txt').then((response) => response.text());
    var files = fileList.trim().split('\n');
    event.waitUntil(
        caches.open(cacheName)
            .then((cache) => cache.addAll([
                '/'
            ].concat(files)))
    );
    console.log('Cached', files);
});

self.addEventListener('fetch', (event) => {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                if (!response && event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }

                return fetch(event.request).then((response) => {
                    const responseClone = response.clone();
                    if (responseClone.headers.has('cache-control') && responseClone.headers.get('cache-control').includes('no-cache')) {
                        return response;
                    }

                    caches.open(cacheName).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                });
            })
    );
});