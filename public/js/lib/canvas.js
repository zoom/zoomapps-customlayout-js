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
        fill = 'black',
        align = 'center',
    } = options;

    const ratio = size / 1000;
    const max = maxWidth - padding;
    const lineHeight = max * ratio;

    const words = text.split(' ');

    let y1 = y;
    let line = '';

    ctx.save();
    ctx.font = `${lineHeight}px ${font}`;
    ctx.fillStyle = fill;
    ctx.textAlign = align;

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

export async function drawQuadrant(options) {
    const { idx, ctx, text = '', participantId } = options;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    const fill = ctx.fillStyle;

    const quadrant = {
        width: width / 2,
        height: height / 2,
    };

    const center = {
        x: Math.floor(quadrant.width),
        y: Math.floor(quadrant.height),
    };

    let x, y, w, h;
    x = y = 0;

    let qw = quadrant.width;
    const padding = Math.max(quadrant.width, quadrant.height) / 100;
    const doublePadding = padding * 2;

    do {
        w = qw * 0.85;
        h = (w * 9) / 16;
        --qw;
    } while (h + doublePadding > quadrant.height);

    const radius = Math.min(qw, h) * 0.3;

    let xPad = Math.floor(
        Math.max(quadrant.width - (w + padding), padding * 2)
    );
    let yPad = Math.floor(
        Math.max(quadrant.height - (h + padding), padding * 2)
    );

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

    clipRoundRect(ctx, xPos, yPos, w, h, radius);

    let imageData;
    const isText = idx === 3 && text;
    if (isText) {
        // Draw a rectangle behind our logo
        const rw = Math.max(w, h) / 2;
        const rh = Math.max(w, h) / 7;

        // Draw Text
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

        const rx = x + (qw - rw);

        const distToBottom = quadrant.height - h;
        const ry = y + (quadrant.height - distToBottom - Math.floor(rh / 2));

        drawRoundRect(ctx, rx, ry, rw, rh, radius, fill);

        // draw our logo
        await drawLogo(ctx, rx, ry, rw, rh);
    }

    imageData = ctx.getImageData(x, y, quadrant.width, quadrant.height);

    return {
        participant: {
            participantId: participantId,
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

export async function draw(options) {
    const { ctx, participants, fill, text = '' } = options;

    const data = [];

    for (let idx = 0; idx < 4; idx++) {
        const participantId = participants[idx];

        const d = await drawQuadrant({
            ctx,
            idx,
            participantId,
            text,
            fill,
        });

        if (d) data.push(d);
    }

    return data;
}
