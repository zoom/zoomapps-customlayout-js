import app from './lib/immersive-app.js';
import socket from './lib/socket.js';
import { draw, drawQuadrant } from './lib/canvas.js';

const colors = {
    black: '#0a0a0a',
    blue: '#2D8CFF',
    green: '#48c774',
    grey: '#b5b5b5',
    red: '#ff3860',
    white: '#fff',
    yellow: '#ffdd57',
};

const settings = {
    cast: [],
    color: colors.blue,
    text: 'Hey there 👋 You can create and select your own topic from the home page',
    uuid: null,
};

const classes = {
    bold: 'has-text-weight-bold',
    hidden: 'is-hidden',
    panel: 'panel-block',
};

const canvas = document.getElementById('uiCanvas');
const ctx = canvas.getContext('2d');

const content = document.getElementById('main');
const controls = document.getElementById('controls');
const hostControls = document.getElementById('hostControls');

const helpMsg = document.getElementById('helpMsg');

const colorSel = document.getElementById('colorSel');
const custColorInp = document.getElementById('custColorInp');

const castSel = document.getElementById('castSel');
const setCastBtn = document.getElementById('setCastBtn');

const startBtn = document.getElementById('startBtn');

const topicBtn = document.getElementById('topicBtn');
const topicInp = document.getElementById('topicInp');
const topicList = document.getElementById('topicList');

async function start() {
    await app.start();
    await app.updateContext();
    showElements();

    if (app.isImmersive() && app.userIsHost)
        await app.sdk.sendAppInvitationToAllParticipants();
}

function showEl(el) {
    el.classList.remove(classes.hidden);
}

function hideEl(el) {
    el.classList.add(classes.hidden);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

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

async function handleDraw() {
    if (app.isImmersive()) {
        // use clientWidth to account for MSFT Windows
        const width = innerWidth * devicePixelRatio;
        const height = innerHeight * devicePixelRatio;

        canvas.style.width = '100%';
        canvas.style.height = '100%';

        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = settings.color;

        console.log(settings.cast);

        // I clear the screen before drawing to avoid visual glitches on fast machines
        await app.clearAllParticipants();
        await app.clearAllImages();

        const data = await draw({
            ctx,
            participants: settings.cast,
            text: settings.text,
        });

        for (let i = 0; i < data.length; i++) {
            const { participant, img } = data[i];
            const id = participant?.participantId;

            await app.drawImage(img);
            if (id) await app.drawParticipant(participant);
        }

        clearCanvas();
    }
}

async function handleUpdate({ topic, participants, color }) {
    const changes = {
        topic: topic && settings.text !== topic,
        color: color && settings.color !== color,
        participants: participants && settings.cast !== participants,
    };

    const allChanged = Object.values(changes).reduce(
        (sum, next) => sum && next,
        true
    );

    if (changes.topic) settings.text = topic;

    if (changes.color) {
        settings.color = color;
        await app.sdk.postMessage({ color: settings.color });
    }

    if (allChanged) {
        settings.cast = participants;
        return await handleDraw();
    }

    if (changes.participants) {
        console.log('parts', participants);
        const hasImages = app.drawnParticipants.length > 0;
        const cast = [];
        for (let i = 0; i < participants.length; i++) {
            const p = participants[i];
            if (!p) continue;

            cast.push(p);

            if (app.isImmersive() && hasImages && !changes.color)
                await redrawParticipant(i, p);
        }

        settings.cast = cast;

        if (app.isImmersive() && !hasImages) await handleDraw();
    }

    if (app.isImmersive()) {
        if (changes.color && !changes.participants) {
            return await handleDraw();
        }

        if (changes.topic) await redrawText();
    }
}

async function redrawText() {
    const idx = 3;

    const { img } = await drawQuadrant({
        idx,
        ctx,
        text: settings.text,
    });

    const oldId = app.drawnImages[idx];
    await app.drawImage(img);

    if (oldId) await app.clearImage(oldId);

    clearCanvas();
}

async function redrawParticipant(idx, p) {
    const { img, participant } = await drawQuadrant({
        ctx,
        idx,
        participantId: p,
    });

    console.log(participant, img);

    await app.drawImage(img);

    if (participant?.participantId) {
        const id = participant.participantId;
        const drawn = app.drawnParticipants[idx];

        console.log(drawn);
        if (drawn) await app.clearParticipant(drawn);

        if (id) await app.drawParticipant(participant);
    }

    clearCanvas();
}

function setCastSelect(participants) {
    for (let i = 0; i < castSel.options.length; i++) castSel.remove(i);

    for (const p of participants) {
        const prefix = p.role === 'host' ? '[You] ' : '';
        const opt = document.createElement('option');

        opt.value = p.participantId;
        opt.text = `${prefix}${p.screenName}`;

        castSel.appendChild(opt);
    }
}

function showElements() {
    const { style } = document.body;

    if (app.isImmersive()) {
        style.backgroundColor = 'white';
        style.overflow = 'hidden';
        hideEl(content);
    } else {
        style.backgroundColor = settings.color;
        showEl(content);
    }

    if (app.isInMeeting()) {
        if (app.userIsHost) {
            showEl(controls);
            showEl(startBtn);
            hideEl(helpMsg);
        } else {
            helpMsg.innerText = 'This app must be started by the host';
        }
    }

    if (app.userIsHost) {
        showEl(hostControls);
        setCastSelect(app.participants);
    }
}

function createTopic(text) {
    const idx = topicList.children.length;
    const a = document.createElement('a');
    a.classList.add(classes.panel);

    a.innerText = text;
    a.onclick = async (e) => {
        settings.text = e.target.innerText;

        if (app.userIsHost)
            socket.emit('sendUpdate', {
                topic: settings.text,
                meetingUUID: settings.uuid,
            });

        await app.sdk.postMessage({ setTopic: settings.text, topicIndex: idx });

        const siblings = a.parentElement.querySelectorAll(`a.${classes.panel}`);

        for (const tag of siblings)
            if (tag !== e.target) tag.classList.remove(classes.bold);
            else tag.classList.add(classes.bold);
    };

    topicList.appendChild(a);
}

colorSel.onchange = async (e) => {
    if (custColorInp.innerText.length > 0) return;

    const color = colors[e.target.value];
    if (!color) return;

    settings.color = color;
    document.body.style.backgroundColor = color;

    await app.sdk.postMessage({
        color,
    });

    if (app.userIsHost)
        socket.emit('sendUpdate', {
            color: settings.color,
            meetingUUID: settings.uuid,
        });
};

custColorInp.onchange = debounce(async (e) => {
    const { value } = e.target;
    if (value.length > 0) {
        settings.color = value;
        document.body.style.backgroundColor = value;

        colorSel.setAttribute('disabled', '');

        await app.sdk.postMessage({
            color: settings.color,
        });

        if (app.userIsHost)
            socket.emit('sendUpdate', {
                color: settings.color,
                meetingUUID: settings.uuid,
            });
    } else {
        colorSel.removeAttribute('disabled');
    }
}, 1000);

topicBtn.onclick = async () => {
    const topic = topicInp.value;

    if (!topic) return;

    createTopic(topic);

    await app.sdk.postMessage({ addTopic: topic });
};

setCastBtn.onclick = async () => {
    const selected = castSel.querySelectorAll('option:checked');
    const len = app.drawnParticipants.length;

    const cast = [];

    for (let i = 0; i < 2 && i < selected.length; i++) {
        const id = selected[i].value;

        if (!id) continue;

        cast.push(id);

        if (app.isImmersive() && len > 0) await redrawParticipant(i, id);
    }

    settings.cast = cast;

    if (app.isImmersive() && len === 0) await handleDraw();
    else if (app.isInMeeting()) await start();
    else if (app.isInClient())
        await app.sdk.postMessage({ cast: settings.cast });

    socket.emit('sendUpdate', {
        participants: settings.cast,
        topic: settings.text,
        color: settings.color,
        meetingUUID: settings.uuid,
    });
};

app.sdk.onConnect(async () => {
    await app.sdk.postMessage({
        participants: app.participants,
        color: settings.color,
        isHost: app.userIsHost,
        uuid: settings.uuid,
    });
});

app.sdk.onMeeting(async ({ action }) => {
    let payload;
    if (action === 'ended') {
        payload = {
            ended: true,
        };
        socket.disconnect();
    }
    app.sdk.postMessage(payload);
});

app.sdk.onParticipantChange(async ({ participants }) => {
    for (const part of participants) {
        const p = {
            screenName: part.screenName,
            participantId: part.participantId.toString(),
            role: part.role,
        };

        const predicate = ({ participantId }) =>
            participantId === p.participantId;

        const i = app.participants.indexOf(predicate);

        if (part.status === 'leave' && i !== -1) {
            app.participants.splice(i, 1);
            const idx = settings.cast.findIndex(p.participantId);

            if (idx === -1) return;
            settings.cast.splice(idx, 1);

            if (app.isImmersive()) await app.clearParticipant(p.participantId);
        } else {
            app.participants.push(p);
        }
    }

    app.sdk.postMessage({ participants: app.participants });
    setCastSelect(app.participants);
});

app.sdk.onMessage(async ({ payload }) => {
    const {
        addTopic,
        color,
        cast,
        ended,
        isHost,
        participants,
        setTopic,
        topicIndex,
        uuid,
    } = payload;

    if (uuid) {
        showEl(controls);
        settings.uuid = uuid;
    } else if (ended) {
        hideEl(controls);
        hideEl(hostControls);
    }

    if (isHost) {
        showEl(hostControls);
        setCastSelect(app.participants);
    }

    if (participants) {
        helpMsg.classList.add(classes.hidden);
        controls.classList.remove(classes.hidden);
        setCastSelect(participants);
    }

    if (cast) {
        settings.cast = cast;

        if (app.isImmersive()) await handleDraw();
        else if (app.isInMeeting()) await start();
    }

    if (color) {
        const idx = Object.values(colors).indexOf(color);
        const isCustom = idx === -1;

        settings.color = color;

        if (isCustom) {
            custColorInp.value = color;
            colorSel.setAttribute('disabled', '');
        } else {
            colorSel.removeAttribute('disabled');
            colorSel.value = Object.keys(colors)[idx];
        }

        if (app.isImmersive()) debounce(handleDraw());
        else document.body.style.backgroundColor = settings.color;
    }

    if (addTopic) createTopic(addTopic);

    if (setTopic) {
        settings.text = setTopic;
        const topics = topicList.querySelectorAll('a');

        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            if (i === topicIndex) {
                topic.classList.add(classes.bold);
            }
            topic.classList.remove(classes.bold);
        }

        if (app.isImmersive()) await redrawText();

        socket.emit('sendUpdate', {
            meetingUUID: settings.uuid,
            topic: settings.text,
        });
    }
});

startBtn.onclick = start;

window.onresize = debounce(handleDraw, 1000);

try {
    await app.init();

    if (!app.isInClient()) {
        const { meetingUUID } = await app.sdk.getMeetingUUID();
        settings.uuid = meetingUUID;

        await app.sdk.connect();

        if (!app.userIsHost) {
            socket.on('update', handleUpdate);
            socket.emit('join', { meetingUUID: settings.uuid });
        }
    }

    showElements();
} catch (e) {
    console.error(e);
}
