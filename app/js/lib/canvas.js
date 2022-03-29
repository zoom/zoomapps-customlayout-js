/**
 * Draw a rectangle on a given HTMLCanvas context
 * @param {CanvasRenderingContext2D} ctx - canvas 2d context
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Number} width - width of the rectangle
 * @param {Number} height - height of the rectangle
 * @param {string | CanvasGradient | CanvasPattern} fill - fillStyle for the rectangle
 */
export function drawRect(ctx, x, y, width, height, fill) {
    ctx.save();
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
}

/**
 * Get the path for a rounded rectangle
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Number} width - width of the rounded rectangle
 * @param {Number} height - height of the rounded rectangle
 * @param {Number} radius - radius of the rounded corners
 * @return {Path2D}
 */
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

/**
 * Clip a transparent rounded rectangle from a context
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Number} width - width of the rounded rectangle
 * @param {Number} height - height of the rounded rectangle
 * @param {Number} radius - radius of the rounded corners
 */
export function clipRoundRect(ctx, x, y, width, height, radius) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#FFF';

    const region = getRoundRectPath(x, y, width, height, radius);

    ctx.fill(region);
    ctx.clip(region);
    ctx.restore();
}

/**
 *
 * @param {CanvasRenderingContext2D} ctx - canvas 2d context
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Number} width - width of the rounded rectangle
 * @param {Number} height - height of the rounded rectangle
 * @param {Number} radius - radius of the corners
 * @param {string | CanvasGradient | CanvasPattern} [fill] - fillStyle for the rectangle
 * @param {string | CanvasGradient | CanvasPattern} [stroke] - strokeStyle for the rectangle
 */
export function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.save();

    const region = getRoundRectPath(x, y, width, height, radius);

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

/**
 * Draw text and account for text-wrapping and text size
 * @param {CanvasRenderingContext2D} ctx - canvas 2d context
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {string} text - text to draw
 * @param {Number} [maxWidth=512] - maximum width of the text
 * @param {Number} [padding=0] - padding subtracted from max width
 * @param {Number} [size=50] - font size
 * @param {string} [font='sans-serif'] - type font
 * @param {string | CanvasGradient | CanvasPattern} [fill='black'] - fillStlye of the text
 * @param {CanvasTextAlign} [align='center'] - text alignment
 */
export function drawText({
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
}) {
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

/**
 * Loads an image from a given URL using a promise
 * @param {String} src - URL to load an image From
 * @return {Promise<unknown>}
 */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = src;
    });
}

/**
 * Draw the Zoom Logo on a context
 * @param {CanvasRenderingContext2D} ctx - canvas 2d context
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Number} width - width of the image
 * @param {Number} height - height of the image
 * @return {Promise<void>}
 */
export async function drawLogo(ctx, x, y, width, height) {
    const logo = await loadImage('/img/zoom.png');

    const hRatio = width / logo.width;
    const vRatio = height / logo.height;
    const ratio = Math.min(hRatio, vRatio);

    const w = logo.width * ratio;
    const h = logo.height * ratio;

    ctx.drawImage(logo, x, y, w, h);
}

/**
 * Draw quadrants of the screen and return information for drawing to Zoom
 * @param {CanvasRenderingContext2D} ctx - canvas 2d context
 * @param {Number} idx - index of the quadrant to draw (0-3)
 * @param {string} [text] - text to draw (only used if idx=3)
 * @param {string} [participantId] - participant to draw at the index (not used if idx=3)
 * @return {Promise<Object>} - data to draw to Zoom
 */
export async function drawQuadrant({ idx, ctx, text, participantId }) {
    if (idx < 0 || idx > 3) throw new Error('idx is outsize of range (0-3)');

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
        Math.max(quadrant.width - (w + padding), doublePadding)
    );
    let yPad = Math.floor(
        Math.max(quadrant.height - (h + padding), doublePadding)
    );

    switch (idx) {
        case 1:
            x = center.x;
            xPad = padding;
            break;
        case 2:
            y = center.y;
            yPad = padding;
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

    if (idx === 3) {
        // Draw a rectangle behind our logo
        const rw = Math.max(w, h) / 2;
        const rh = Math.max(w, h) / 7;

        const rx = x + (qw - rw);

        const distToBottom = quadrant.height - h;
        const ry = y + (quadrant.height - distToBottom - Math.floor(rh / 2));

        if (text) {
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

        drawRoundRect(ctx, rx, ry, rw, rh, radius, fill);

        // draw our logo
        await drawLogo(ctx, rx, ry, rw, rh);
    }

    const imageData = ctx.getImageData(x, y, quadrant.width, quadrant.height);

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

/**
 * Draw 4 quadrants filling the entire screen and rety
 * @param {CanvasRenderingContext2D} ctx - canvas 2d context
 * @param {Array.<String>} participants - participants IDs to map to quadrants
 * @param {String} [fill] - fill Style to use
 * @param {String} text - text to draw for the last quadrant
 * @return {Promise<*[Object]>} - data for drawing to Zoom
 */
export async function draw({ ctx, participants, fill, text }) {
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
