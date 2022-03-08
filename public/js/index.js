/* global zoomSdk */

async function configure() {
    return zoomSdk.config({
        size: { width: 480, height: 360 },
        capabilities: [
            'getRunningContext',
            'runRenderingContext',
            'closeRenderingContext',
            'drawParticipant',
            'clearParticipant',
            'drawImage',
            'clearImage',
            'onMyMediaChange',
        ],
    });
}

async function drawImage(src, x, y, zIndex) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = async () => {
            const drawCtx = await zoomSdk.drawImage({
                imageData: img,
                x,
                y,
                zIndex,
            });

            resolve(drawCtx);
        };

        img.onerror = (e) => reject(e);
    });
}

(async () => {
    try {
        const configResponse = await configure();
        console.debug('configuration', configResponse);

        const ctx = await drawImage('/img/zoom.png');
        console.debug('Image Drawn', JSON.stringify(ctx));
    } catch (e) {
        console.error(e);
    }
})();
