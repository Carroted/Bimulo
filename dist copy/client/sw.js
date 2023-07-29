/*
Until this issue is resolved, this Service Worker will be in JS instead of TS.
https://github.com/Microsoft/TypeScript/issues/11781
*/

const cacheName = 'simulo-1';
//console.log('Service Worker starting...');
self.addEventListener('activate', async (event) => {
    console.log('Service Worker activated');
});

async function cacheEverything() {
    // first, fetch /fileList.txt
    const fileList = await fetch('filelist.txt').then((response) => response.text());
    var files = fileList.trim().split('\n');
    return files;
}

self.addEventListener('install', async (event) => {
    var files = await cacheEverything();
    /*
        event.waitUntil(
            caches.open(cacheName)
                .then((cache) => cache.addAll([
                    '/Simulo'
                ].concat(files)))
        );
        console.log('Cached ' + files.length + ' files');*/
    // lets cache individually for debugging
    for (let file of files) {
        var cache = await caches.open(cacheName)
        try {
            await cache.add(file);
            console.log('Cached ' + file);
        }
        catch (e) {
            console.log('Failed to cache ' + file);
        }
    }
    console.log('Cached ' + files.length + ' files');
    console.log('Service Worker installed!');
});
self.addEventListener('fetch', async (event) => {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
        console.log('Only-if-cached request for', event.request.url);
        return;
    }

    /*var match = await caches.match(event.request);
    if (match) {
        console.log('Cache hit for', event.request.url);
        event.respondWith(match);
        return;
    }
    else {
        console.log('Cache miss for', event.request.url);
    }*/
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                console.log('Cache hit for', event.request.url);
                return response;
            }
            else {
                console.log('Cache miss for', event.request.url);
                // fetch and cache
                return fetch(event.request).then((response) => {
                    if (response.status === 200) {
                        // cache
                        var responseClone = response.clone();
                        caches.open(cacheName).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                });
            }
        })
    );
});

async function update() {
    console.log('Updating...');
    // clear all caches
    caches.keys().then((names) => {
        for (let name of names) {
            caches.delete(name);
        }
    }
    );
    // cache everything
    var files = await cacheEverything();
    await caches.open(cacheName)
        .then((cache) => cache.addAll([
            '/Simulo'
        ].concat(files)));
    console.log('Update complete!');
}
/*
onmessage = async function (event) {
    console.log('Message received:', event.data);
    if (event.data.type === 'update') {
        await update();
        postMessage({ key: event.data.key });
    }
    console.log('Done!')
};*/
self.addEventListener('message', async (event) => {
    console.log('ServiceWorker Message Handler: Message received:', event.data);
    if (event.data.type === 'update') {
        await update();
        event.ports[0].postMessage('Successfully updated!');
    }
    console.log('ServiceWorker Message Handler: Done!')
});