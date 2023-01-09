/**
 * This template is a production ready boilerplate for developing with `PlaywrightCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

// For more information, see https://sdk.apify.com
import { Actor, Dataset } from 'apify';
// For more information, see https://crawlee.dev
import { PlaywrightCrawler, Dictionary } from 'crawlee';
import { router } from './routes.js';

// Initialize the Apify SDK
await Actor.init();

const input = await Actor.getInput<Dictionary>();

const startUrls = ['https://www.amazon.com/Hair-Care-Products-Beauty/b/?ie=UTF8&node=11057241'];

const proxyConfiguration = await Actor.createProxyConfiguration({
    useApifyProxy: !!input?.useProxy,
});

const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    requestHandler: router,
    postNavigationHooks: [
        async ({ page }) => {
            // debugger;
        },
    ],
    maxConcurrency: 2,
});

await crawler.run(startUrls);

const dataset = await Dataset.open(input!.datasetName);
const datasetInfo = await dataset.getInfo();

if (input?.callImageDownloader) {
    const imageDownloaderInput = {
        convertWebpToPng: false,
        datasetId: datasetInfo?.id,
        fileNameFunction: '({url, md5}) => md5(url)',
        imageCheckType: 'content-type',
        noDownloadRun: false,
        outputTo: 'dataset',
        pathToImageUrls: 'images',
        proxyConfiguration: {
            useApifyProxy: true,
        },
        s3CheckIfAlreadyThere: false,
        uploadStoreName: 'productImages',
        uploadTo: 'key-value-store',
    };

    await Actor.call('lukaskrivka/images-download-upload', imageDownloaderInput);
}

// Exit successfully
await Actor.exit();
