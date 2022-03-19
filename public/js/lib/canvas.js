import app from './immersive-app.js';

function getQuadrantSize() {
    const device = {
        width: innerWidth * devicePixelRatio,
        height: innerHeight * devicePixelRatio,
    };

    return {
        width: Math.floor(device.width / 2),
        height: Math.floor(device.height / 2),
        xCenter: Math.floor(device.width / (devicePixelRatio * 2)),
        yCenter: Math.floor(device.height / (devicePixelRatio * 2)),
    };
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (e) => reject(e));
        img.src = src;
    });
}

export function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
}

export function drawRect(ctx, x, y, width, height, fill) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
}

export function drawBackground(ctx, width, height, fill) {
    drawRect(ctx, 0, 0, width, height, fill);
}

export function getRoundRectPath(x, y, width, height, radius) {
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

export function clipRoundRect(ctx, x, y, width, height, rad) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#FFF';
    ctx.lineWidth = 0;

    const region = getRoundRectPath(x, y, width, height, rad);

    ctx.fill(region);
    ctx.clip(region);
    ctx.restore();
}

export function drawRoundRect(ctx, x, y, width, height, rad, fill, stroke) {
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

export function drawText({
    ctx,
    text,
    x,
    y,
    maxWidth = 512,
    padding = 0,
    size = 50,
    font = 'sans-serif',
}) {
    const ratio = size / 1000;
    const max = maxWidth - padding;
    const lineHeight = max * ratio;

    const words = text.split(' ');

    let y1 = y;
    let line = '';

    ctx.save();
    ctx.font = `${lineHeight}px ${font}`;
    ctx.textAlign = 'center';

    for (let i = 0; i < words.length; i++) {
        const str = `${words[i]} `;
        const temp = `${line}${str}`;
        const { width } = ctx.measureText(temp);

        if (i > 0 && width > max) {
            ctx.fillText(line, x, y1);
            line = str;
            y1 += lineHeight;
        } else {
            line = temp;
        }
    }

    ctx.fillText(line, x, y1, max);

    ctx.restore();
}

export async function drawLogo(ctx, x, y, scale) {
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

async function drawQuadrant({
    idx,
    fill,
    width,
    height,
    xCenter,
    yCenter,
    participant,
}) {
    console.log('drawing index', idx);
    const ctx = createCanvas(width, height);
    drawBackground(ctx, width, height, fill);

    const w = Math.floor(width * 0.85);
    const h = Math.floor((w * 9) / 16);

    let x, y;
    x = y = 0;

    const padding = 10 * devicePixelRatio;
    let xPad = Math.max(width - (w + padding), 20);
    let yPad = Math.max(height - (h + padding), 20);

    switch (idx) {
        case 1:
            x = xCenter;
            xPad = padding;
            break;
        case 2:
            yPad = padding;
            y = yCenter;
            break;
        case 3:
            xPad = padding;
            yPad = padding;
            x = xCenter;
            y = yCenter;
            break;
    }

    const xPos = Math.floor(x + xPad / devicePixelRatio);
    const yPos = Math.floor(y + yPad / devicePixelRatio);

    const rad = Math.floor(width / 7);

    clipRoundRect(ctx, xPad, yPad, w - 1, h - 1, rad);

    const isText = idx === 3;
    if (isText) {
        const rw = Math.floor(w / 2);
        const rh = Math.floor(w / 7);

        // Draw a rectangle behind our logo
        const rr = rad;
        const rx = width - rw;

        const distToBottom = height - h;
        const ry = height - distToBottom - Math.floor(rh / 2);

        drawRoundRect(ctx, rx, ry, rw, rh, rr, fill);

        // draw our logo
        await drawLogo(ctx, rx, ry, 0.25 * devicePixelRatio);

        let text =
            'Ja morant broke his own franchise record with only 32 points just two days after setting it';
        const wordPad = Math.floor((h - rh) / 2);
        const size = 64;

        drawText({
            ctx,
            text,
            size,
            x: Math.floor(w / 2) + xPad,
            y: Math.floor(yPad / 2) + wordPad,
            padding: wordPad,
            maxWidth: w,
            font: 'Arial Black',
        });
    }

    const imageData = await getImageData(ctx, width, height);

    await app.drawImage({
        imageData,
        x: `${x}px`,
        y: `${y}px`,
        zIndex: idx,
    });

    if (participant?.participantId) {
        // We need to divide out the scaling ratio for drawing participants
        const vWidth = Math.floor(w / devicePixelRatio);
        const vHeight = Math.floor(h / devicePixelRatio);

        return await app.drawParticipant({
            participantId: participant.participantId,
            x: `${xPos}px`,
            y: `${yPos}px`,
            width: `${vWidth}px`,
            height: `${vHeight}px`,
            zIndex: idx,
        });
    }
}

export async function drawIndex(idx, participant, fill) {
    await drawQuadrant({ idx, participant, fill, ...getQuadrantSize() });
}

export async function draw(participants, fill) {
    const dimensions = getQuadrantSize();

    // Iterate zIndexes - start at 1
    for (let idx = 0; idx < 4; idx++) {
        const participant = participants[idx];
        await drawQuadrant({ idx, participant, fill, ...dimensions });
    }
}
