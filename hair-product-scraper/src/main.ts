/**
 * This template is a production ready boilerplate for developing with `PlaywrightCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

// For more information, see https://sdk.apify.com
import { Actor } from 'apify';
// For more information, see https://crawlee.dev
import { PlaywrightCrawler, Dataset } from 'crawlee';
import { router } from './routes.js';

// Initialize the Apify SDK
await Actor.init();

const startUrls = ['https://www.amazon.com/Hair-Care-Products-Beauty/b/?ie=UTF8&node=11057241'];

const proxyConfiguration = await Actor.createProxyConfiguration({
    useApifyProxy: !!process.env.USE_PROXY,
});

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: router,
    headless: false,
    postNavigationHooks: [
        async ({ page }) => {
            // debugger;
        },
    ],
});

await crawler.run(startUrls);

await Dataset.exportToJSON('data', {
    toKVS: 'data',
});

// Exit successfully
await Actor.exit();
