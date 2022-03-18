// eslint-disable-next-line import/no-unresolved
import app from '/js/lib/immersive-app.js';

const colors = {
    black: 'hsl(0, 0%, 4%)',
    blue: 'hsl(217, 71%, 53%)',
    darkBlue: 'hsl(204, 86%, 53%)',
    green: 'hsl(141, 53%, 53%)',
    grey: 'hsl(0, 0%, 71%)',
    red: 'hsl(348, 100%, 61%)',
    white: 'hsl(0, 0%, 100%)',
    yellow: 'hsl(48, 100%, 67%)',
    zoomBlue: 'hsl(213, 100%, 59%)',
};

const settings = {
    participants: [],
    color: colors.zoomBlue,
};

const shownParticipants = [];

function debounce(fn, ms = 250) {
    let timer;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn.apply(this, arguments);
        }, ms);
    };
}

function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
}

function drawBackground(ctx, width, height) {
    ctx.save();
    ctx.fillStyle = settings.color;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

function getRoundRectPath(x, y, width, height, radius) {
    const region = new Path2D();

    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;

    region.moveTo(x + radius, y);

    region.arcTo(x + width, y, x + width, y + height, radius);
    region.arcTo(x + width, y + height, x, y + height, radius);
    region.arcTo(x, y + height, x, y, radius);
    region.arcTo(x, y, x + width, y, radius);

    region.closePath();

    return region;
}

function clipRoundRect(ctx, x, y, width, height, rad) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    const region = getRoundRectPath(x, y, width, height, rad);

    ctx.fill(region);
    ctx.clip(region);
    ctx.restore();
}

function drawRoundRect(ctx, x, y, width, height, rad, fill, stroke) {
    ctx.save();

    const region = getRoundRectPath(x, y, width, height, rad);

    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke(region);
    }

    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill(region);
    }

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
    const width = Math.floor(logo.width * scale);
    const height = Math.floor(logo.height * scale);

    ctx.drawImage(logo, x, y, width, height);
}

function getImageData(ctx, width, height) {
    return new Promise((resolve, reject) => {
        const imageData = ctx.getImageData(0, 0, width, height);
        imageData ? resolve(imageData) : reject(`imageData is invalid`);
    });
}

async function drawQuadrant({ idx, xCenter, yCenter, width, height }) {
    const ctx = createCanvas(width, height);
    drawBackground(ctx, width, height);

    const w = Math.floor(width * 0.9);
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

    const rad = Math.floor(width / 6);

    clipRoundRect(ctx, xPad, yPad, w - 1, h - 1, rad);

    if (idx === 4) {
        const rw = Math.floor(w / 2);
        const rh = w / 5;

        const rr = Math.floor(rad / 2);
        const rx = width - rw;
        const ry = height - (rh + (height - h - rr));

        drawRoundRect(ctx, rx, ry, rw, rh, rr, settings.color);

        await drawLogo(ctx, rx, ry, 0.5 * rh * devicePixelRatio);
    }

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

function getDimensions() {
    const device = {
        width: innerWidth * devicePixelRatio,
        height: innerHeight * devicePixelRatio,
    };

    return {
        width: device.width / 2,
        height: device.height / 2,
        xCenter: device.width / (devicePixelRatio * 2),
        yCenter: device.height / (devicePixelRatio * 2),
    };
}

async function drawIndex(idx) {
    await drawQuadrant({ idx, ...getDimensions() });
}

async function draw() {
    await app.clearScreen();
    const dimensions = getDimensions();

    for (let i = 1; i <= 4; i++) await drawQuadrant({ idx: i, ...dimensions });
}

async function handleParticipantChange({ participants }) {
    for (const part of participants) {
        console.log('part', part);
        const p = {
            screenName: part.screenName,
            participantId: part.participantId.toString(),
            role: part.role,
        };

        const predicate = ({ participantId }) =>
            participantId === p.participantId;

        const i = app.participants.findIndex(predicate);

        console.log(p);
        console.log(i);

        if (part.status === 'join') {
            app.participants.push(p);

            if (shownParticipants.length < 3) {
                console.log('pushed to shown');
                shownParticipants.push(p);

                await drawIndex(shownParticipants.length);
            }
        } else if (i !== -1) {
            app.participants.splice(i, 1);
            const idx = shownParticipants.findIndex(predicate);
            console.log(idx);
            if (idx !== -1) {
                await app.clearParticipant(p.participantId);
                shownParticipants.splice(i, 1);
            }
        }
    }
}

const mainContent = document.getElementById('main');

const colorSel = document.getElementById('colorSel');
const customColorInp = document.getElementById('custColorInp');
const participantSel = document.getElementById('participantSel');

const helpMsg = document.getElementById('helpMsg');

const startBtn = document.getElementById('startBtn');

startBtn.addEventListener('click', async () => {
    await app.start();
    const isImmersive = await app.isImmersive();
    if (!isImmersive) return;

    mainContent.style.visibility = 'hidden';

    shownParticipants[0] = app.user;
    const others = app.participants.filter(
        (p) => p.participantId !== app.user.participantId
    );

    shownParticipants.push(...others.splice(0, 2));
});

colorSel.addEventListener('change', async (e) => {
    if (customColorInp.innerText.length > 0) return;

    const color = colors[e.target.value];
    if (!color) return;

    settings.color = color;
    document.body.style.backgroundColor = color;

    console.log(settings.color);

    if (await app.isImmersive()) {
        try {
            await draw();
        } catch (e) {
            console.error('failed to update color', e);
        }
    }
});

customColorInp.addEventListener(
    'change',
    debounce((e) => {
        const v = e.target.value;
        if (v && typeof v === 'string') settings.color = v;
    }, 1000)
);

window.addEventListener(
    'resize',
    debounce(async () => await draw(), 1000)
);

app.sdk.onParticipantChange(handleParticipantChange);

try {
    await app.init();
    const inMeeting = await app.isInMeeting();

    if (inMeeting) {
        const c = 'is-hidden';
        participantSel.classList.remove(c);
        startBtn.classList.remove(c);

        helpMsg.style.display = 'none';
    }
} catch (e) {
    console.error(e);
}
