/* global zoomSdk */

async function configure() {
    return zoomSdk.config({
        size: { width: 480, height: 360 },
        capabilities: [
            'getRunningContext',
            'getUserContext',
            'runRenderingContext',
            'closeRenderingContext',
            'drawParticipant',
            'clearParticipant',
            'drawImage',
            'clearImage',
            'onMyMediaChange',
            'onMeeting',
        ],
    });
}

async function startRender(viewMode) {
    // immersive mode can only be used in-meeting
    const appCtx = await zoomSdk.getRunningContext();
    if (appCtx !== 'inMeeting') return Promise.resolve(false);

    return zoomSdk.runRenderingContext({ view: viewMode });
}

async function stopRender() {
    return zoomSdk.closeRenderingContext();
}

/*async function drawStaticImage(src, x = "0px", y = "0px", zIndex = 1) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = function () {
            const r = zoomSdk.drawImage({
                imageData: this,
                x,
                y,
                zIndex
            });
            resolve(r);
        };

        img.onerror = (e) => reject(e);
        img.src = src;
    });
}*/

async function drawParticipant(
    participantId,
    x = '0px',
    y = '0px',
    zIndex = 1,
    width = '100%',
    height = '100%'
) {
    return zoomSdk.drawParticipant({
        participantId,
        x,
        y,
        width,
        height,
        zIndex,
    });
}

async function addEventListeners() {
    await zoomSdk.addEventListener('onMeeting', async (eventInfo) => {
        switch (eventInfo.action) {
            case 'started':
                await startRender('immersive');
                break;
            case 'ended':
                await stopRender();
                break;
            default:
                break;
        }
    });
}

(async () => {
    try {
        const configResponse = await configure();
        console.debug('configuration', configResponse);

        await startRender('immersive');

        // immersive mode can only be started by the host
        const user = await zoomSdk.getUserContext();

        if (user.role !== 'host') return false; // send app invitation here

        await addEventListeners();

        await drawParticipant(
            user.participantId,
            null,
            '-100vh',
            null,
            '50%',
            '50%'
        );
    } catch (e) {
        console.error('Immersive mode failure', e);
    }
})();
