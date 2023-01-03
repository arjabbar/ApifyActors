import { Dataset, createPlaywrightRouter, Dictionary } from 'crawlee';
import { Actor } from 'apify';

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ log, page, enqueueLinksByClickingElements }) => {
    await enqueueLinksByClickingElements({
        selector: '[title=Shampoos]',
        label: 'subcategory',
    });
});

router.addHandler('subcategory', async ({ request, page, log, enqueueLinks }) => {
    const input = (await Actor.getInput()) as Dictionary;
    const MAX_PAGES = input.maxPages ?? 5;
    const MAX_ITEMS_PER_PAGE = input.maxItemsPerPage ?? 5;

    const title = await page.title();
    const pageNumber = request.userData.pageNumber ?? 1;

    log.info(`${title}`, { url: request.loadedUrl });
    log.info(`On page ${pageNumber} of ${MAX_PAGES}. Capturing ${MAX_ITEMS_PER_PAGE} items on this page.`);

    await enqueueLinks({
        selector: '[data-component-type=s-product-image] > a',
        label: 'product',
        limit: MAX_ITEMS_PER_PAGE,
    });

    if (pageNumber >= MAX_PAGES) {
        return;
    }

    await enqueueLinks({
        selector: '.s-pagination-next',
        label: 'subcategory',
        userData: {
            pageNumber: pageNumber + 1,
        },
    });
});

router.addHandler('product', async ({ request, page, log }) => {
    const title = (await page.innerText('#productTitle')).trim();
    const imageSrc = await page.getAttribute('[data-a-image-name=landingImage]', 'src');

    const details: any = {};

    const productDetailsString = await page.innerText('[data-feature-name=productOverview]');

    productDetailsString?.split('\n').forEach((line) => {
        const splitLine = line.split('\t');
        details[splitLine[0]] = splitLine[1];
    });

    const productDetailsString2 = await page.innerText('#detailBullets_feature_div');

    productDetailsString2?.split('\n').forEach((line) => {
        const splitLine = line.split(' : ');
        details[splitLine[0].trim()] = splitLine[1].trim();
    });

    const product = { title, imageSrc, details, url: request.loadedUrl };

    log.info('Storing product', product);

    await Dataset.pushData(product);
});
