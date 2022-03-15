// eslint-disable-next-line import/no-unresolved
import app from '/js/lib/immersive-app.js';

function getRectImage(width, height, fillStyle, strokeStyle) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fillRect(0, 0, width, height);
        }
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.strokeRect(0, 0, width, height);
        }
        const imageData = ctx.getImageData(0, 0, width, height);
        //console.log("imageData:", imageData);
        imageData ? resolve(imageData) : reject('Error');
    });
}

try {
    await app.init();
    await app.start();
} catch (e) {
    console.error(e);
}

window.addEventListener(
    'resize',
    app.debounce(async () => {
        try {
            await app.clearAllImages();

            const w = app.device.width / 2;
            const h = app.device.height / 2;

            const quadrants = [];

            for (let i = 0; i < 4; i++) {
                let x, y;
                x = y = 0;
                let color = 'Blue';

                const x1 = Math.floor(
                    app.device.width / (app.device.pixelRatio * 2)
                );
                const y1 = Math.floor(
                    app.device.height / (app.device.pixelRatio * 2)
                );

                switch (i) {
                    case 1:
                        x = x1;
                        color = 'Black';
                        break;
                    case 2:
                        y = y1;
                        color = 'Red';
                        break;
                    case 3:
                        x = x1;
                        y = y1;
                        color = 'Yellow';
                        break;
                    default:
                        break;
                }

                console.log(i);
                const imageData = await getRectImage(w, h, color);

                const data = {
                    imageData,
                    x: `${x}px`,
                    y: `${y}px`,
                    zIndex: i,
                };
                console.log(data);
                quadrants.push(data);
            }

            console.log(`${w}x${h}`);

            for (const q of quadrants) await app.drawImage(q);
        } catch (e) {
            console.error(e);
        }
    })
);

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
