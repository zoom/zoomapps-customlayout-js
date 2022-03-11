// eslint-disable-next-line import/no-unresolved
import app from '/js/lib/immersive-app.js';

try {
    await app.init();
    await app.start();

    for (const part of app.participants) {
        console.log(part);
    }

    await app.drawParticipant(app.user.participantId);
} catch (e) {
    console.error(e);
}

/*
async function drawStaticImage(src, x = 0, y = 0, zIndex = 1) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = function () {
            if (!offscreen.ctx)
                return;

            const w = video.width;
            const h = video.height;

            offscreen.ctx.drawImage(img, 0, 0, w, h);
            const imageData = offscreen.ctx.getImageData(0,0, w, h);
            offscreen.ctx.clearRect(0,0, w, h);

            const r = zoomSdk.drawImage({
                zIndex,
                imageData,
                x: `${x}px`,
                y: `${y}px`,
            });
            resolve(r);
        };

        img.onerror = (e) => reject(e);
        img.src = src;
    });
}

async function drawParticipant(participantId, x = '0px', y = '0px', zIndex = 1, width = '100%', height = '100%') {
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

}*/
