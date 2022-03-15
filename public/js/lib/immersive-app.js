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

            this.sdk.onParticipantChange(({ participants }) => {
                const join = 'join';
                const leave = 'leave';
                for (const part of participants) {
                    const p = {
                        participantId: part.participantId,
                        role: part.role,
                        screenName: part.screenName,
                    };
                    const i = this.#participants.indexOf(p);

                    if (i !== -1) {
                        switch (p.status) {
                            case join:
                                this.#participants[i] = p;
                                break;
                            case leave:
                                this.#participants.splice(i, 1);
                                break;
                        }
                    } else if (p.status === join) {
                        this.#participants.push(p);
                    }
                }
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

    set video({ width, height }) {
        this.#video = {
            width,
            height,
        };
    }

    get device() {
        const pixelRatio = window.devicePixelRatio;
        return {
            pixelRatio,
            width: window.innerWidth * pixelRatio,
            height: window.innerHeight * pixelRatio,
        };
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
        const {
            participantId = this.#user.participantId,
            x = '0px',
            y = '0px',
            width = '100%',
            height = '100%',
            zIndex = 1,
        } = options;

        await this.sdk.drawParticipant({
            participantId,
            x,
            y,
            width,
            height,
            zIndex,
        });

        this.#drawnParticipants.push(participantId);

        return participantId;
    }

    async drawImage(options) {
        const { imageId } = await this.sdk.drawImage(options);
        console.log('imageId', imageId);
        this.#drawnImages.push(imageId);

        return imageId;
    }

    async clearAllImages() {
        while (this.#drawnImages.length > 0) {
            const imageId = this.#drawnImages.pop();
            console.debug('clearing image', imageId);
            await this.sdk.clearImage({ imageId });
        }
    }

    inviteAllParticipants() {
        return this.sdk.sendAppInvitationToAllParticipants();
    }

    #redraw() {
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