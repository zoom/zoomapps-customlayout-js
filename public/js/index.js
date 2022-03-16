// eslint-disable-next-line import/no-unresolved
import app from '/js/lib/immersive-app.js';

const zoomBlue = '#2D8CFF';

function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
}

function drawBackground(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = '#2D8CFF';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

function clipRoundRect(ctx, x, y, width, height, radius) {
    ctx.save();
    //ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(0,0,0,0)';
    ctx.fillStyle = zoomBlue;

    const rad = { tl: radius, tr: radius, br: radius, bl: radius };

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();

    ctx.moveTo(x + rad.tl, y);
    ctx.lineTo(x + width - rad.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + rad.tr);

    ctx.lineTo(x + width, y + height - rad.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - rad.br, y + height);

    ctx.lineTo(x + rad.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - rad.bl);

    ctx.lineTo(x, y + rad.tl);
    ctx.quadraticCurveTo(x, y, x + rad.tl, y);

    ctx.fill();
    ctx.closePath();
    ctx.clip();
    ctx.restore();
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (e) => reject(e));
        img.src = src;
    });
}

async function drawLogo(ctx, x, y, width, height) {
    const logo = await loadImage('/img/zoom.png');
    ctx.save();
    ctx.drawImage(logo, x, y, width, height);
    ctx.restore();
}

function getImageData(ctx, width, height) {
    return new Promise((resolve, reject) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        imageData ? resolve(imageData) : reject(`imageData is invalid`);
    });
}

try {
    await app.init();
    await app.start();

    /*    app.sdk.callZoomApi('connect')
    await app.sdk.addEventListener('onMessage', async ({action}) => {
        if (action === 'ended') {
            await app.sdk.callZoomApi("postMessage", {exampleData: "some data to sync"});
            app.sdk.callZoomApi("endSyncData", {});
        }
    })*/
} catch (e) {
    console.error(e);
}

window.addEventListener(
    'resize',
    app.debounce(async () => {
        const device = {
            width: innerWidth * devicePixelRatio,
            height: innerHeight * devicePixelRatio,
        };

        // We can't draw a full width HIDPI canvas so we'll draw quadrants.
        const width = device.width / 2;
        const height = device.height / 2;

        const x1 = device.width / (devicePixelRatio * 2);
        const y1 = device.height / (devicePixelRatio * 2);

        try {
            await app.clearScreen();

            for (let i = 1; i <= 4; i++) {
                const ctx = createCanvas(width, height);
                drawBackground(ctx, width, height);

                const w = Math.floor(width * 0.85);
                const h = Math.floor((w * 9) / 16);

                let x, y;
                x = y = 0;

                const padding = 10 * devicePixelRatio;
                let xPad = Math.max(width - (w + padding), 0);
                let yPad = Math.max(height - (h + padding), 0);

                switch (i) {
                    case 2:
                        x = x1;
                        xPad = padding;
                        break;
                    case 3:
                        yPad = padding;
                        y = y1;
                        break;
                    case 4:
                        xPad = padding;
                        yPad = padding;
                        x = x1;
                        y = y1;
                        break;
                }

                clipRoundRect(ctx, xPad, yPad, w - 1, h - 1, 25);

                if (i === 4) await drawLogo(ctx, 0, 0, 256, 128);

                const imageData = await getImageData(ctx, width, height);

                await app.drawImage({
                    imageData,
                    x: `${x}px`,
                    y: `${y}px`,
                    zIndex: i + 1,
                });

                // We need to divide out the scaling ratio for drawing participants
                const vWidth = Math.floor(w / devicePixelRatio);
                const vHeight = Math.floor(h / devicePixelRatio);

                const xPos = Math.floor(x + xPad / devicePixelRatio);
                const yPos = Math.floor(y + yPad / devicePixelRatio);

                const p = app.participants[i - 1];

                if (p) {
                    await app.drawParticipant({
                        x: `${xPos}px`,
                        y: `${yPos}px`,
                        participantId: p.participantId,
                        width: `${vWidth}px`,
                        height: `${vHeight}px`,
                        zIndex: i,
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, 1000)
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
