import app from './lib/immersive-app.js';
import { draw, drawIndex } from './lib/canvas.js';

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
    cast: [],
    color: colors.zoomBlue,
};

const mainContent = document.getElementById('main');

const colorSel = document.getElementById('colorSel');
const customColorInp = document.getElementById('custColorInp');
const participantList = document.getElementById('participants');

const helpMsg = document.getElementById('helpMsg');

const startBtn = document.getElementById('startBtn');

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
        console.log('part', part);
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

startBtn.addEventListener('click', async () => {
    await app.start();
    await app.updateContext();

    const isImmersive = app.isImmersive();
    if (!isImmersive) return;

    mainContent.classList.add('is-hidden');

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
        await app.clearScreen();
        await draw(settings.cast, settings.color);
    }, 1000)
);

app.sdk.onParticipantChange(handleParticipantChange);

try {
    await app.init();

    const c = 'is-hidden';

    if (!app.isImmersive()) {
        mainContent.classList.remove(c);
    }

    if (app.isInMeeting()) {
        participantList.classList.remove(c);
        startBtn.classList.remove(c);

        helpMsg.classList.add(c);
    }
} catch (e) {
    console.error(e);
}
