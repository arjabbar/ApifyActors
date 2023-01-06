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
    const images = [];
    if (imageSrc) {
        images.push(imageSrc);
    }

    const productOverview = await page.innerText('[data-feature-name=productOverview]');
    log.info(`Product Overview`, { productOverview });

    const detailBullets = await page.innerText('#detailBullets_feature_div');
    log.info(`Details Bullet`, { detailBullets });

    const details: any = {
        ...(await getDetailsFromMultilineString(detailBullets)),
        ...(await getDetailsFromMultilineString(productOverview)),
    };

    const product = { title, images, details, url: request.loadedUrl };

    log.info('Storing product', product);

    const input = await Actor.getInput<Dictionary>();
    const dataset = await Dataset.open(input!.datasetName);
    await dataset.pushData(product);
});

async function getDetailsFromMultilineString(detailsStr: string) {
    const parsedDetails = {} as any;
    if (!detailsStr) {
        return;
    }

    const input = await Actor.getInput<Dictionary>();

    detailsStr.split('\n').forEach((line) => {
        const splitLine = line.split(new RegExp(input?.detailsSplitRegex ?? /\t|(\W*:\W*)/gi, 'gi'));
        // If we parsed air, do nothing
        if (!splitLine[0] || !splitLine[splitLine.length - 1]) {
            return;
        }

        // Remove non-word characters from keys and values. ex. "Is Discontinued " => "IsDiscontinued"
        const detailName = splitLine[0].trim();
        const detailValue = splitLine[splitLine.length - 1].trim();

        if (!detailName || !detailValue) {
            return;
        }

        parsedDetails[detailName] = detailValue;
    });

    return parsedDetails;
}
