import { createServer } from 'http';
import { Server } from 'socket.io';
import debug from 'debug';
import { appName } from '../config.js';

const dbg = debug(`${appName}:http`);
const dbgWS = debug(`${appName}:socket-io`);

// we'll store rooms in a map for the sample - you could also use MongoDB
const rooms = new Map();

function err(socket, code, message) {
    dbgWS('error', `[${code}] ${message}`);
    socket.emit('error', {
        code,
        message,
    });
}

function checkUUID(socket, uuid) {
    const isUUID = uuid && typeof uuid === 'string';

    if (!isUUID) err(socket, 400, 'Meeting UUID cannot be blank');

    return isUUID;
}

function onConnection(io) {
    return (socket) => {
        let room;

        socket.on('join', ({ meetingUUID }) => {
            if (!checkUUID(socket, meetingUUID)) return;

            if (!room) {
                room = meetingUUID;
                socket.join(room);
            }

            if (rooms.has(room))
                io.to(socket.id).emit('update', rooms.get(room));
        });

        socket.on(
            'sendUpdate',
            ({ participants, topic, color, meetingUUID }) => {
                if (!checkUUID(socket, meetingUUID)) return;

                if (!room) {
                    room = meetingUUID;
                    socket.join(room);
                }

                const data = rooms.has(room) ? rooms.get(room) : {};

                const changes = {
                    topic: topic && data.topic !== topic,
                    participants: participants && data.participants !== topic,
                    color: color && data.color !== color,
                };

                if (changes.topic) data.topic = topic;

                if (changes.participants) data.participants = participants;

                if (changes.color) data.color = color;

                rooms.set(room, data);
                socket.to(room).emit('update', data);
            }
        );
    };
}

/**
 * Initialize the socket.io websocket handler
 * @param {Server} server HTTP Server
 */
function startWS(server) {
    const io = new Server(server, {
        transports: ['websocket'],
        maxHttpBufferSize: 1e8,
        pingTimeout: 60000,
    });

    io.on('connection', onConnection(io));
}

/**
 * Start the HTTP server
 * @param app - Express app to attach to
 * @param {String|number} port - local TCP port to serve from
 */
export async function start(app, port) {
    // Create HTTP server
    const server = createServer(app);
    startWS(server);

    // let the user know when we're serving
    server.on('listening', () => {
        const addr = server.address();
        const bind =
            typeof addr === 'string'
                ? `pipe ${addr}`
                : `http://localhost:${addr.port}`;
        dbg(`Listening on ${bind}`);
    });

    server.on('error', async (error) => {
        if (error?.syscall !== 'listen') throw error;

        const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

        // handle specific listen errors with friendly messages
        switch (error?.code) {
            case 'EACCES':
                throw new Error(`${bind} requires elevated privileges`);
            case 'EADDRINUSE':
                throw new Error(`${bind} is already in use`);
            default:
                throw error;
        }
    });

    // Listen on provided port, on all network interfaces
    return server.listen(port);
}
