import app from './lib/immersive-app.js';
import { draw, drawIndex } from './lib/canvas.js';

const colors = {
    black: '#0a0a0a',
    green: '#48c774',
    grey: '#b5b5b5',
    red: '#ff3860',
    white: '#fff',
    yellow: '#ffdd57',
    blue: '#2e8cff',
};

const settings = {
    cast: [],
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

function setParticipantSel(el) {
    for (const p of app.participants) {
        const opt = document.createElement('option');

        opt.value = p.participantId;
        opt.text = `[${p.role}] ${p.screenName}`;

        el.appendChild(opt);
    }
}

const mainContent = document.getElementById('main');

const colorSel = document.getElementById('colorSel');
const customColorInp = document.getElementById('custColorInp');
const participantList = document.getElementById('participants');
const participantSel = document.getElementById('participantSel');

const helpMsg = document.getElementById('helpMsg');
const startBtn = document.getElementById('startBtn');

startBtn.addEventListener('click', async () => {
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
});

colorSel.addEventListener('change', async (e) => {
    if (customColorInp.innerText.length > 0) return;

    const color = colors[e.target.value];
    if (!color) return;

    settings.color = color;
    document.body.style.backgroundColor = color;
});

customColorInp.addEventListener(
    'change',
    debounce((e) => {
        const { value } = e.target;
        if (value) {
            settings.color = value;
            document.body.style.backgroundColor = value;
        }
    }, 250)
);

window.addEventListener(
    'resize',
    debounce(async () => {
        if (app.isImmersive()) {
            await app.clearScreen();
            await draw(settings.cast, settings.color);
        }
    }, 250)
);

app.sdk.onParticipantChange(handleParticipantChange);

try {
    await app.init();

    const c = 'is-hidden';

    if (app.isImmersive()) {
        document.body.style.backgroundColor = 'white';
    } else {
        document.body.style.backgroundColor = settings.color;
        mainContent.classList.remove(c);
    }

    if (app.isInMeeting()) {
        startBtn.classList.remove(c);

        helpMsg.classList.add(c);

        participantList.classList.remove(c);
        setParticipantSel(participantSel);
    }
} catch (e) {
    console.error(e);
}
