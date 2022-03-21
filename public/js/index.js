import app from './lib/immersive-app.js';
import { draw, drawQuadrant } from './lib/canvas.js';

const canvas = document.getElementById('uiCanvas');
const ctx = canvas.getContext('2d');

const hiddenClass = 'is-hidden';

const colors = {
    black: '#0a0a0a',
    green: '#48c774',
    grey: '#b5b5b5',
    red: '#ff3860',
    white: '#fff',
    yellow: '#ffdd57',
    blue: '#2D8CFF',
};

const settings = {
    cast: [],
    text: 'Hey there 👋 You can create your own topic from the home page',
    color: colors.blue,
};

const content = document.getElementById('main');
const controls = document.getElementById('controls');
const hostControls = document.getElementById('hostControls');

const colorSel = document.getElementById('colorSel');
const custColorInp = document.getElementById('custColorInp');

const participantSel = document.getElementById('participantSel');

const helpMsg = document.getElementById('helpMsg');

const startBtn = document.getElementById('startBtn');
const topicBtn = document.getElementById('topicBtn');

const topicInp = document.getElementById('topicInp');
const topicList = document.getElementById('topicList');

function debounce(fn, ms = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn.apply(this, args);
        }, ms);
    };
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function showEl(el) {
    el.classList.remove(hiddenClass);
    console.log(el);
}

function hideEl(el) {
    el.classList.add(hiddenClass);
}

async function handleParticipantChange({ participants }) {
    for (const part of participants) {
        const p = {
            screenName: part.screenName,
            participantId: part.participantId.toString(),
            role: part.role,
        };

        const predicate = ({ participantId }) =>
            participantId === p.participantId;

        const i = app.participants.findIndex(predicate);

        if (part.status === 'join') {
            app.participants.push(p);

            const idx = settings.cast.length;
            if (idx >= 3) return;

            settings.cast.push(p);
            await redrawParticipant(idx, p);
        } else if (i !== -1) {
            app.participants.splice(i, 1);
            const idx = settings.cast.findIndex(predicate);
            if (idx !== -1) {
                await app.clearParticipant(p.participantId);
                settings.cast.splice(i, 1);
            }
        }
    }
}

function setParticipantSel(participants) {
    const el = participantSel;

    for (let i = 0; i < el.children.length; i++) el.remove(i);

    for (const p of participants) {
        const opt = document.createElement('option');

        opt.value = p.participantId;
        opt.text = `[${p.role}] ${p.screenName}`;

        el.appendChild(opt);
    }
}

async function handleDraw() {
    if (app.isImmersive()) {
        const width = innerWidth * devicePixelRatio;
        const height = innerHeight * devicePixelRatio;

        canvas.width = width;
        canvas.height = height;

        canvas.style.width = '100%';
        canvas.style.height = '100%';
        ctx.fillStyle = settings.color;

        await app.clearAllImages();

        const data = await draw({
            ctx,
            participants: settings.cast,
            text: settings.text,
        });

        for (let i = 0; i < data.length; i++) {
            const p = data[i].participant;

            if (i < data.length - 1 && p?.participantId)
                await app.drawParticipant(p);

            const img = data[i].img;
            await app.drawImage(img);
        }

        clearCanvas();
    }
}

async function redrawText(text) {
    const idx = 3;

    const { img } = await drawQuadrant({
        idx,
        ctx,
        text,
    });

    const oldId = app.drawnImages[idx];
    if (oldId) await app.clearImage(oldId);

    if (img?.imageData) await app.drawImage(img);

    clearCanvas();
}

async function redrawParticipant(idx, p) {
    const { img, participant } = await drawQuadrant({
        ctx,
        idx,
        participant: p,
    });

    if (img?.imageData) await app.drawImage(img);

    if (participant?.participantId) await app.drawParticipant(participant);

    clearCanvas();
}

function showElements() {
    const { style } = document.body;

    if (app.isImmersive()) {
        style.backgroundColor = 'white';
        style.overflow = 'hidden';
    } else {
        style.backgroundColor = settings.color;
        showEl(content);
    }

    if (app.isInMeeting()) {
        showEl(controls);
        showEl(startBtn);
        hideEl(helpMsg);
    }

    if (app.user.role === 'host') {
        showEl(hostControls);
        setParticipantSel(app.participants);
    }
}

function createTopic(text) {
    const a = document.createElement('a');
    const c = 'panel-block';

    a.classList.add(c);
    a.innerText = text;
    a.onclick = async (e) => {
        const siblings = a.parentElement.querySelectorAll(`a.${c}`);
        const activeClass = 'has-text-primary';

        settings.text = e.target.innerText;
        await app.sdk.postMessage({ setTopic: settings.text });

        for (const tag of siblings)
            if (tag !== e.target) tag.classList.remove(activeClass);
            else tag.classList.add(activeClass);
    };

    topicList.appendChild(a);
}

startBtn.onclick = async () => {
    await app.start();

    hideEl(content);

    document.body.style.backgroundColor = 'white';

    await app.updateContext();

    const isImmersive = app.isImmersive();
    if (!isImmersive) return;

    settings.cast[0] = app.user;

    const others = app.participants.filter(
        (p) => p.participantId !== app.user.participantId
    );

    settings.cast.push(...others.splice(0, 2));
};

colorSel.onchange = async (e) => {
    if (custColorInp.innerText.length > 0) return;

    const color = colors[e.target.value];
    if (!color) return;

    settings.color = color;
    document.body.style.backgroundColor = color;

    await app.sdk.postMessage({
        color: e.target.value,
    });
};

custColorInp.onchange = debounce(async (e) => {
    const { value } = e.target;
    if (value.length > 0) {
        settings.color = value;
        document.body.style.backgroundColor = value;

        colorSel.setAttribute('disabled', '');

        await app.sdk.postMessage({
            custColor: settings.color,
        });
    } else {
        colorSel.removeAttribute('disabled');
    }
}, 1000);

participantSel.onchange = (e) => {
    console.log('selected', e.target.value);
};

topicBtn.onclick = async () => {
    const topic = topicInp.value;

    if (!topic) return;

    createTopic(topic);

    await app.sdk.postMessage({ addTopic: topic });
};

app.sdk.onParticipantChange(handleParticipantChange);

app.sdk.onConnect(async () => {
    const idx = colorSel.selectedIndex;
    await app.sdk.postMessage({
        participants: app.participants,
        color: colorSel.options[idx].text.toLowerCase(),
        custColor: custColorInp.value,
        isHost: app.user.role === 'host',
    });
});

app.sdk.onMeeting(async ({ action }) => {
    let payload;
    if (action === 'started') payload = { started: true };
    app.sdk.postMessage(payload);
});

app.sdk.onMessage(async ({ payload }) => {
    console.log(payload);
    const {
        isHost,
        started,
        ended,
        participants,
        color,
        custColor,
        setTopic,
        addTopic,
    } = payload;

    if (started) {
        showEl(controls);
    } else if (ended) {
        hideEl(controls);
        hideEl(hostControls);
    }

    if (isHost) {
        showEl(hostControls);
        setParticipantSel(app.participants);
    }

    if (participants) {
        helpMsg.classList.add(hiddenClass);
        controls.classList.remove(hiddenClass);
        setParticipantSel(participants);
    }

    if (custColor) {
        colorSel.setAttribute('disabled', '');
        settings.color = custColor;
        custColorInp.value = custColor;
    } else {
        colorSel.removeAttribute('disabled');
    }

    if (color) {
        settings.color = colors[color];
        colorSel.value = color;
    }

    if (color || custColor)
        if (app.isImmersive()) debounce(handleDraw());
        else document.body.style.backgroundColor = settings.color;

    if (addTopic) createTopic(addTopic);

    if (setTopic && app.isImmersive()) {
        settings.text = setTopic;
        await redrawText(setTopic);
    }
});

window.onresize = debounce(handleDraw, 1000);

try {
    await app.init();
    if (!app.isInClient()) await app.sdk.connect();

    showElements();

    if (app.isImmersive()) await handleDraw();
} catch (e) {
    console.error(e);
}
