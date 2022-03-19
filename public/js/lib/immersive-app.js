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
        state: false,
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

    get context() {
        return this.#context;
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
                'onConnect',
                'onMessage',
                'onMyMediaChange',
                'onParticipantChange',
                'runRenderingContext',
                'sendAppInvitationToAllParticipants',
            ],
        });
        console.debug('Configuration', conf);

        if (conf.media?.video) this.video = conf.media.video;

        this.sdk.callZoomApi('connect');

        await this.updateContext();

        if (this.isInMeeting()) {
            this.user = await this.sdk.getUserContext();

            // Store current participants
            const { participants } = await this.sdk.getMeetingParticipants();
            this.#participants = participants;
        }

        return conf;
    }

    async start() {
        // check that we're running as the host
        if (this.user.role !== 'host') return;

        // check that we're in a meeting
        if (!this.isInMeeting()) return;

        // Start rendering Immersive Mode
        return this.sdk.runRenderingContext({ view: 'immersive' });
    }

    async stop() {
        if (this.isImmersive()) return this.sdk.closeRenderingContext();
    }

    async updateContext() {
        this.#context = await this.sdk.getRunningContext();
    }

    isInMeeting() {
        return this.#context === this.#contexts.inMeeting;
    }

    isImmersive() {
        return this.#context === this.#contexts.inImmersive;
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
            this.sdk.clearParticipant({ participantId });
        }
    }

    async clearParticipant(participantId) {
        await this.sdk.clearParticipant({ participantId });
        const i = this.#drawnParticipants.indexOf(participantId);
        this.#drawnParticipants.splice(i, 1);
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
