import app from './lib/immersive-app.js';
import { draw, drawIndex } from './lib/canvas.js';

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
    text: "Hey there 👋  I'm just a sample topic. You can pick your own topic from the home page 🏠",
    color: colors.blue,
};

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

            const len = settings.cast.length;
            if (len >= 3) return;

            settings.cast.push(p);

            await drawIndex(len, p, settings.color);
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

function setParticipantSel(el, participants) {
    if (participants) helpMsg.classList.add(hiddenClass);

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
        await app.clearScreen();
        await draw(settings.cast, settings.color, settings.text);
    }
}

const mainContent = document.getElementById('main');

const colorSel = document.getElementById('colorSel');
const customColorInp = document.getElementById('custColorInp');

const participantList = document.getElementById('participants');
const participantSel = document.getElementById('participantSel');

const helpMsg = document.getElementById('helpMsg');

const startBtn = document.getElementById('startBtn');
const applyBtn = document.getElementById('applyBtn');

const topicBtn = document.getElementById('topicBtn');
const topicInp = document.getElementById('topicInp');
const topicList = document.getElementById('topicList');

startBtn.onclick = async () => {
    await app.start();

    mainContent.classList.add('is-hidden');
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
    if (customColorInp.innerText.length > 0) return;

    const color = colors[e.target.value];
    if (!color) return;

    settings.color = color;
    document.body.style.backgroundColor = color;

    await app.sdk.postMessage({
        color: e.target.value,
    });
};

customColorInp.onchange = debounce(async (e) => {
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

    const a = document.createElement('a');
    const c = 'panel-block';

    a.classList.add(c);
    a.innerText = topic;
    a.onclick = async () => {
        const siblings = a.parentElement.querySelectorAll(`a.${c}`);
        const activeClass = 'has-text-danger';

        settings.text = a.innerText;
        await app.sdk.postMessage({ infoText: settings.text });

        for (const tag of siblings)
            if (tag !== a) tag.classList.remove(activeClass);
            else tag.classList.add(activeClass);
    };

    topicList.appendChild(a);
    await app.sdk.postMessage({ a });
};

app.sdk.onParticipantChange(handleParticipantChange);

app.sdk.onMeeting(({ action }) => {
    if (action === 'ended') {
        participantList.classList.add(hiddenClass);
        window.location.reload();
    }
});

app.sdk.onMessage(async ({ payload }) => {
    console.log(payload);
    const { participants, color, custColor, infoText, addTopic } = payload;

    if (participants) {
        console.log(participants);
        participantList.classList.remove(hiddenClass);
        setParticipantSel(participantSel, participants);
    }

    if (custColor) {
        colorSel.setAttribute('disabled', '');
        settings.color = custColor;
        customColorInp.value = custColor;
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

    if (addTopic) {
        const a = document.createElement('a');
        a.innerText = addTopic.innerText;
        a.onclick = addTopic.onclick;
        a.classList = addTopic.classList;
        topicList.appendChild(a);
    }

    if (infoText && app.isImmersive()) await infoText(infoText, settings.color);
});

try {
    await app.init();

    app.onResize = debounce(handleDraw, 750);

    if (app.isInClient() && app.user.role === 'host') {
        applyBtn.classList.remove(hiddenClass);
    }

    if (app.isImmersive()) {
        document.body.style.backgroundColor = 'white';
    } else {
        document.body.style.backgroundColor = settings.color;
        mainContent.classList.remove(hiddenClass);
    }

    if (app.isInMeeting()) {
        startBtn.classList.remove(hiddenClass);

        if (app.user.role === 'host')
            participantList.classList.remove(hiddenClass);
        setParticipantSel(participantSel, app.participants);
    }

    if (!app.isInClient()) {
        await app.sdk.connect();

        await app.sdk.postMessage({
            participants: app.participants,
            color: Object.keys(colors).find(
                (key) => colors[key] === settings.color
            ),
        });
    }
} catch (e) {
    console.error(e);
}
