// eslint-disable-next-line import/no-unresolved
import app from '/js/lib/immersive-app.js';

function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
}

function drawBackground(ctx, width, height) {
    ctx.save();

    ctx.fillStyle = '#2D8CFF';

    ctx.rect(0, 0, width, height);
    ctx.fill();
}

function clipRoundRect(ctx, x, y, width, height, radius) {
    ctx.save();
    //ctx.lineWidth = 75;
    ctx.strokeStyle = 'rgba(0,0,0,0)';
    ctx.fillStyle = '#2D8CFF';

    if (typeof radius === 'undefined') {
        radius = 5;
    }

    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
        const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
        for (let side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();

    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius.br,
        y + height
    );
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
    ctx.clip();
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

        const width = Math.floor(device.width / 2);
        const height = Math.floor(device.height / 2);

        const x1 = Math.floor(device.width / (devicePixelRatio * 2));
        const y1 = Math.floor(device.height / (devicePixelRatio * 2));

        try {
            await app.clearAllImages();

            for (let i = 1; i <= 4; i++) {
                const ctx = createCanvas(width, height);
                drawBackground(ctx, width, height);

                let x, y;
                x = y = 0;

                let w = width * 0.85;
                let h = (w * 9) / 16;

                const padding = 5 * devicePixelRatio;
                let xPad = Math.max(width - (w + padding), 0);
                let yPad = Math.max(height - (h + padding), 0);

                switch (i) {
                    case 1:
                        await app.drawParticipant({
                            x: `${xPad}px`,
                            y: `${yPad}px`,
                            participantId:
                                i === 1 ? app.user.participantId : null,
                            width: `${w}px`,
                            height: `${h}px`,
                            zIndex: 1,
                        });
                        break;
                    case 2:
                        xPad = padding;
                        x = x1;
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
                    default:
                        break;
                }

                clipRoundRect(ctx, xPad, yPad, w, h, 25);

                const imageData = await getImageData(ctx, width, height);

                await app.drawImage({
                    imageData,
                    x: `${x}px`,
                    y: `${y}px`,
                    zIndex: i + 1,
                });
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
