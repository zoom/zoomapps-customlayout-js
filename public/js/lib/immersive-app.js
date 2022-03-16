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

            this.sdk.onMyMediaChange(
                ({ media: video }) => (this.video = video)
            );

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

    set video({ width, height }) {
        this.#video = {
            width,
            height,
        };
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
                'sendAppInvitationToAllParticipants',
            ],
        });
        console.debug('Configuration', conf);

        this.video = conf.media.video;
        const { participants } = await this.sdk.getMeetingParticipants();
        this.#participants = participants;

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

        return this.sdk.runRenderingContext({ view: 'immersive' });
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
        console.debug('image drawn', imageId);

        return imageId;
    }

    async clearAllImages() {
        while (this.#drawnImages.length) {
            const imageId = this.#drawnImages.pop();
            await this.sdk.clearImage({ imageId });
            console.debug('cleared image', imageId);
        }
    }

    async clearAllParticipants() {
        while (this.#drawnParticipants.length) {
            const participantId = this.#drawnParticipants.pop();
            console.log('participandId', participantId);
            await this.sdk.clearParticipant({ participantId });
            console.debug('cleared participant', participantId);
        }
    }

    async clearScreen() {
        await this.clearAllParticipants();
        await this.clearAllImages();
    }

    inviteAllParticipants() {
        return this.sdk.sendAppInvitationToAllParticipants();
    }

    async #redraw() {
        for (const p of this.#drawnParticipants) {
            const { participantId } = p;
            console.log(p);
            this.sdk.clearParticipant({ participantId });
        }
    }
}

// Export a singleton of the class
const instance = new ImmersiveApp();
Object.freeze(instance);
export default instance;
