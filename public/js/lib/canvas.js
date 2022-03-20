import app from './immersive-app.js';

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (e) => reject(e));
        img.src = src;
    });
}

export function drawRect(ctx, x, y, width, height, fill) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
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

    ctx.fill(region, 'evenodd');
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

export function drawText(options) {
    const {
        ctx,
        text,
        x,
        y,
        maxWidth = 512,
        padding = 0,
        size = 50,
        font = 'sans-serif',
    } = options;

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

export async function drawLogo(ctx, x, y, width, height) {
    const logo = await loadImage('/img/zoom.png');

    const hRatio = width / logo.width;
    const vRatio = height / logo.height;
    const ratio = Math.min(hRatio, vRatio);

    const w = logo.width * ratio;
    const h = logo.height * ratio;

    ctx.drawImage(logo, x, y, w, h);
}

async function drawQuadrant(options) {
    const { idx, ctx, fill, text = '', width, height, participant } = options;

    const quadrant = {
        width: width / 2,
        height: height / 2,
    };

    const center = {
        x: Math.floor(quadrant.width),
        y: Math.floor(quadrant.height),
    };

    const radius = quadrant.width * 0.15;

    const w = quadrant.width * 0.85;
    const h = (w * 9) / 16;

    let x, y;
    x = y = 0;

    console.log('here');
    const padding = 10;
    let xPad = Math.floor(Math.max(quadrant.width - (w + padding), 20));
    let yPad = Math.floor(Math.max(quadrant.height - (h + padding), 20));

    switch (idx) {
        case 1:
            x = center.x;
            xPad = padding;
            break;
        case 2:
            yPad = padding;
            y = center.y;
            break;
        case 3:
            xPad = padding;
            yPad = padding;
            x = center.x;
            y = center.y;
            break;
    }

    const xPos = x + xPad;
    const yPos = y + yPad;

    drawRect(ctx, x, y, quadrant.width, quadrant.height, fill);

    clipRoundRect(ctx, xPos, yPos, w - 1, h - 1, radius);
    let imageData;
    const isText = idx === 3 && text;
    if (isText) {
        const rw = w / 2;
        const rh = w / 7;

        // Draw a rectangle behind our logo
        const rr = radius;
        const rx = x + (quadrant.width - rw);

        const distToBottom = quadrant.height - h;
        const ry = y + (quadrant.height - distToBottom - Math.floor(rh / 2));

        drawRoundRect(ctx, rx, ry, rw, rh, rr, fill);

        // draw our logo
        await drawLogo(ctx, rx, ry - padding, rw, rh);

        const wordPad = Math.floor((h - rh) / 2);
        const size = 64;

        drawText({
            ctx,
            text,
            size,
            x: x + Math.floor(w / 2) + xPad,
            y: y + Math.floor(yPad / 2) + wordPad,
            padding: wordPad,
            maxWidth: w,
            font: 'Arial Black',
        });
    }

    imageData = ctx.getImageData(x, y, quadrant.width, quadrant.height);

    return {
        participant: {
            participantId: participant?.participantId,
            x: `${Math.floor(xPos / devicePixelRatio)}px`,
            y: `${Math.floor(yPos / devicePixelRatio)}px`,
            width: w,
            height: h,
            zIndex: idx,
        },
        img: {
            imageData,
            x: `${Math.floor(x / devicePixelRatio)}px`,
            y: `${Math.floor(y / devicePixelRatio)}px`,
            zIndex: idx + 1,
        },
    };
}

export async function drawIndex(options) {
    const { ctx, idx, participant, fill, width, height, text = '' } = options;

    await drawQuadrant({
        ctx,
        idx,
        participant,
        text,
        fill,
        width,
        height,
    });
}

export async function updateText(options) {
    const { text, fill, width, height } = options;
    return drawIndex({ idx: 3, text, fill, width, height });
}

export async function draw(options) {
    const { ctx, width, height, participants, fill, text = '' } = options;

    const data = [];

    for (let idx = 0; idx < 4; idx++) {
        let participant;
        if (participants[idx]) participant = participants[idx];

        const d = await drawQuadrant({
            ctx,
            idx,
            participant,
            text,
            fill,
            width,
            height,
        });

        if (d) data.push(d);
    }

    for (let i = 0; i < data.length; i++) {
        const img = data[i].img;
        console.log('idx', img);

        if (img.imageData) await app.drawImage(img);

        const participant = data[i].participant;

        if (participant.participantId) await app.drawParticipant(participant);
    }

    ctx.clearRect(0, 0, width, height);
}
