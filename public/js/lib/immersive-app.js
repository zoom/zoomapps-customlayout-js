/* global zoomSdk */

class ImmersiveApp {
    static #instance;
    #sdk = zoomSdk;

    #user = {
        participantId: null,
        role: null,
        screenName: null,
    };

    #video = {
        width: 0,
        height: 0,
    };

    #drawnImages = [];
    #drawnParticipants = [];
    #participants = [];

    #context = '';

    #contexts = {
        inMeeting: 'inMeeting',
        inImmersive: 'inImmersive',
    };

    #timer = null;

    constructor() {
        // use this class as a singleton
        if (!ImmersiveApp.#instance) {
            if (!this.sdk)
                throw new Error('Zoom App JS SDK is not loaded on the page');

            this.sdk.onMyMediaChange(async (e) => {
                this.video = e.media.video;
                console.log('Media Changed', e);
            });

            ImmersiveApp.#instance = this;
        }

        return ImmersiveApp.#instance;
    }

    get sdk() {
        return this.#sdk;
    }

    get video() {
        return this.#video;
    }

    set video({ state, width, height }) {
        this.#video.state = state ?? (width !== 0 && height !== 0);
        if (width) this.#video.width = width;
        if (height) this.#video.height = height;

        console.log('video', this.#video);
    }

    get participants() {
        return this.#participants;
    }

    get user() {
        return this.#user;
    }

    set user({ participantId, role, screenName }) {
        this.#user = {
            role,
            screenName,
            participantId,
        };
    }

    debounce(fn, ms) {
        return () => {
            clearTimeout(this.#timer);
            this.#timer = setTimeout(() => {
                this.#timer = null;
                fn.apply(this, arguments);
            }, ms);
        };
    }

    async init() {
        const conf = await this.sdk.config({
            capabilities: [
                'clearImage',
                'clearParticipant',
                'closeRenderingContext',
                'drawImage',
                'drawParticipant',
                'getMeetingParticipants',
                'getRunningContext',
                'getUserContext',
                'onMeeting',
                'onMyMediaChange',
                'onParticipantChange',
                'runRenderingContext',
                'showNotification',
                'sendAppInvitationToAllParticipants',
            ],
        });
        console.debug('Configuration', conf);

        if (conf.media.video) this.video = conf.media.video;

        return conf;
    }

    async start() {
        // check what context the app is running inMeeting
        this.#context = await this.sdk.getRunningContext();
        console.debug('Running Context', this.#context);

        // check that we're running as the host
        this.user = await this.sdk.getUserContext();
        console.debug('Current User', this.user);

        const isNotHost = this.user.role !== 'host';
        const isNotMeeting = this.#context !== this.#contexts.inMeeting;

        if (isNotHost || isNotMeeting) return;

        await this.sdk.runRenderingContext({ view: 'immersive' });

        const { participants } = await this.sdk.getMeetingParticipants();
        this.#participants = participants;
    }

    stop() {
        const allowed = [this.#contexts.inMeeting, this.#contexts.inImmersive];

        if (allowed.includes(this.#context))
            return this.sdk.closeRenderingContext();
    }

    async drawParticipant(options) {
        const res = await this.sdk.drawParticipant(options);

        this.#drawnParticipants.push(options.participantId);

        return res;
    }

    async drawImage(options) {
        const { imageId } = await this.sdk.drawImage(options);
        this.#drawnImages.push(imageId);

        return imageId;
    }

    async clearAllImages() {
        while (this.#drawnImages.length) {
            const imageId = this.#drawnImages.pop();
            await this.sdk.clearImage({ imageId });
        }
    }

    async clearAllParticipants() {
        while (this.#drawnParticipants.length) {
            const participantId = this.#drawnParticipants.pop();
            await this.sdk.clearParticipant({ participantId });
        }
    }

    async clearScreen() {
        await this.clearAllParticipants();
        await this.clearAllImages();
    }

    inviteAllParticipants() {
        return this.sdk.sendAppInvitationToAllParticipants();
    }
}

// Export a singleton of the class
const instance = new ImmersiveApp();
Object.freeze(instance);
export default instance;
