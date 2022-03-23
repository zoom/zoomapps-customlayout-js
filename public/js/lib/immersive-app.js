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
        inClient: 'inMainClient',
    };

    constructor() {
        // use this class as a singleton
        if (!ImmersiveApp.#instance) {
            if (!this.sdk)
                throw new Error('Zoom App JS SDK is not loaded on the page');

            this.sdk.onMyMediaChange(
                async ({ media: video }) => (this.video = video)
            );

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
    }

    get participants() {
        return this.#participants;
    }

    get drawnImages() {
        return this.#drawnImages;
    }

    get userIsHost() {
        return this.user.role === 'host';
    }

    get drawnParticipants() {
        return this.#drawnParticipants;
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
                'connect',
                'drawImage',
                'drawParticipant',
                'getMeetingParticipants',
                'getMeetingUUID',
                'getRunningContext',
                'getUserContext',
                'onConnect',
                'onMeeting',
                'onMessage',
                'onMyMediaChange',
                'onParticipantChange',
                'postMessage',
                'runRenderingContext',
                'sendAppInvitationToAllParticipants',
            ],
        });
        console.debug('Configuration', conf);

        if (conf.media?.video) this.video = conf.media.video;

        this.#context = conf.runningContext;

        if (this.isInMeeting()) {
            this.user = await this.sdk.getUserContext();

            if (this.userIsHost) {
                const { participants } =
                    await this.sdk.getMeetingParticipants();

                // set the host first in the array
                this.#participants = [
                    this.user,
                    ...participants.filter(
                        (p) => p.participantId !== this.user.participantId
                    ),
                ];
            }
        }

        return conf;
    }

    async start() {
        // check that we're running as the host
        if (!this.userIsHost) return;

        // check that we're in a meeting
        if (!this.isInMeeting()) return;

        // Start rendering Immersive Mode
        await this.sdk.runRenderingContext({ view: 'immersive' });
    }

    async stop() {
        return this.sdk.closeRenderingContext();
    }

    async updateContext() {
        this.#context = await this.sdk.getRunningContext();
        return this.#context;
    }

    isInMeeting() {
        return this.#context === this.#contexts.inMeeting;
    }

    isInClient() {
        return this.#context === this.#contexts.inClient;
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

    async clearImage(imageId) {
        const i = this.#drawnImages.indexOf(imageId);
        this.#drawnImages.splice(i, 1);

        return this.sdk.clearImage({ imageId });
    }

    async clearAllImages() {
        while (this.#drawnImages.length > 0) {
            const imageId = this.#drawnImages.pop();
            await this.sdk.clearImage({ imageId });
        }
    }

    async clearAllParticipants() {
        while (this.#drawnParticipants.length > 0) {
            const participantId = this.#drawnParticipants.pop();
            await this.sdk.clearParticipant({ participantId });
        }
    }

    async clearParticipant(participantId) {
        const i = this.#drawnParticipants.indexOf(participantId);
        this.#drawnParticipants.splice(i, 1);

        return this.sdk.clearParticipant({ participantId });
    }
}

// Export a singleton of the class
const instance = new ImmersiveApp();
Object.freeze(instance);
export default instance;
