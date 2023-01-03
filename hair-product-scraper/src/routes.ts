import { Dataset, createPlaywrightRouter } from 'crawlee';

const MAX_PAGES = Number.parseInt(process.env.MAX_PAGES!, 10) ?? 5;
const MAX_ITEMS_PER_PAGE = Number.parseInt(process.env.MAX_ITEMS_PER_PAGE!, 10) ?? 5;

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ log, page, enqueueLinksByClickingElements }) => {
    await enqueueLinksByClickingElements({
        selector: '[title=Shampoos]',
        label: 'subcategory',
    });
});

router.addHandler('subcategory', async ({ request, page, log, enqueueLinks }) => {
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
    const productDetailsString = await page.innerText('[data-feature-name=productOverview]');
    const imageSrc = await page.getAttribute('[data-a-image-name=landingImage]', 'src');
    const details: any = {};

    productDetailsString?.split('\n').forEach((line) => {
        const splitLine = line.split('\t');
        details[splitLine[0]] = splitLine[1];
    });

    const product = { title, imageSrc, details };

    log.info('Storing product', product);

    await Dataset.pushData(product);
});
