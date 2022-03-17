// eslint-disable-next-line import/no-unresolved
import app from '/js/lib/immersive-app.js';

const zoomBlue = '#2D8CFF';

const shownParticipants = [];

function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
}

function drawBackground(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = zoomBlue;
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

async function drawLogo(ctx, x, y, scale) {
    const logo = await loadImage('/img/zoom.png');
    const width = logo.width * scale;
    const height = logo.height * scale;

    ctx.drawImage(logo, x, y, width, height);
}

function getImageData(ctx, width, height) {
    return new Promise((resolve, reject) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        imageData ? resolve(imageData) : reject(`imageData is invalid`);
    });
}

async function drawQuadrant(idx, width, height, xCenter, yCenter) {
    const ctx = createCanvas(width, height);
    drawBackground(ctx, width, height);

    const w = Math.floor(width * 0.85);
    const h = Math.floor((w * 9) / 16);

    let x, y;
    x = y = 0;

    const padding = 10 * devicePixelRatio;
    let xPad = Math.max(width - (w + padding), 0);
    let yPad = Math.max(height - (h + padding), 0);

    switch (idx) {
        case 2:
            x = xCenter;
            xPad = padding;
            break;
        case 3:
            yPad = padding;
            y = yCenter;
            break;
        case 4:
            xPad = padding;
            yPad = padding;
            x = xCenter;
            y = yCenter;
            break;
    }

    const xPos = Math.floor(x + xPad / devicePixelRatio);
    const yPos = Math.floor(y + yPad / devicePixelRatio);

    clipRoundRect(ctx, xPad, yPad, w - 1, h - 1, 100 * devicePixelRatio);

    if (idx === 4)
        await drawLogo(
            ctx,
            width - xPad,
            height - yPad,
            0.5 * devicePixelRatio
        );

    const imageData = await getImageData(ctx, width, height);

    await app.drawImage({
        imageData,
        x: `${x}px`,
        y: `${y}px`,
        zIndex: idx + 1,
    });

    // We need to divide out the scaling ratio for drawing participants
    const vWidth = Math.floor(w / devicePixelRatio);
    const vHeight = Math.floor(h / devicePixelRatio);

    const p = shownParticipants[idx - 1];

    if (p?.participantId) {
        await app.drawParticipant({
            participantId: p.participantId,
            x: `${xPos}px`,
            y: `${yPos}px`,
            width: `${vWidth}px`,
            height: `${vHeight}px`,
            zIndex: idx,
        });
    }
}

async function drawIndex(idx) {
    console.log('drawing index', idx);
    const { center, quadrant } = calcScreen();

    await drawQuadrant(
        idx,
        quadrant.width,
        quadrant.height,
        center.x,
        center.y
    );
}

async function draw() {
    await app.clearScreen();

    for (let i = 1; i <= 4; i++) await drawIndex(i);
}

function calcScreen() {
    const device = {
        width: innerWidth * devicePixelRatio,
        height: innerHeight * devicePixelRatio,
    };

    return {
        quadrant: {
            width: device.width / 2,
            height: device.height / 2,
        },
        center: {
            x: device.width / (devicePixelRatio * 2),
            y: device.height / (devicePixelRatio * 2),
        },
    };
}

window.addEventListener(
    'resize',
    app.debounce(async () => await draw(), 1000)
);

try {
    await app.init();
    await app.start();

    console.log('participants', app.participants);

    shownParticipants[0] = app.user;
    const others = app.participants.filter(
        (p) => p.participantId !== app.user.participantId
    );
    shownParticipants.push(...others.splice(0, 2));
    console.log(shownParticipants);

    app.sdk.onParticipantChange(({ participants }) => {
        for (const part of participants) {
            const p = {
                participantId: part.participantId,
                role: part.role,
                screenName: part.screenName,
            };

            const i = app.participants.indexOf(p);

            if (part.status === 'join') {
                app.participants.push(p);
                if (shownParticipants.length < 3) {
                    console.log('pushed to shown');
                    shownParticipants.push(p);
                    //app.debounce(async () => await drawIndex(i), 1000);
                }
            } else if (i !== -1) {
                app.participants.splice(i, 1);

                const idx = shownParticipants.indexOf(p);
                if (idx !== -1) {
                    console.log('spliced from shown');
                    shownParticipants.splice(i, 1);
                    //app.debounce(async () => await drawIndex(i), 1000);
                }
            }
        }
    });
} catch (e) {
    console.error(e);
    app.sdk.showNotification({
        type: 'error',
        title: 'Immersive App Error',
        message: e.message,
    });
}
