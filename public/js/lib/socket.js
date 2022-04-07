/* global io */

const socket = io(window.location.origin, {
    transports: ['websocket', 'polling'],
});

socket.on('error', ({ message, code }) => {
    const e = new Error(message);
    e.code = code;
    console.error(e);
});

export default socket;
