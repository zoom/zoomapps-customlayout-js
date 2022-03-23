import { createServer } from 'http';
import { Server } from 'socket.io';
import debug from 'debug';
import { appName } from '../config.js';

const dbg = debug(`${appName}:http`);
const dbgWS = debug(`${appName}:socket-io`);
const rooms = new Map();

/**
 * Initialize the socket.io websocket handler
 * @param {Server} server HTTP Server
 */
function startWS(server) {
    // make sure to version our protocol

    const io = new Server(server, {
        transports: ['websocket'], // disable HTTP long-polling
        maxHttpBufferSize: 1e8,
        pingTimeout: 60000,
    });

    io.on('connection', (socket) => {
        let room;

        socket.on('join', ({ meetingUUID }) => {
            dbg('client evt', meetingUUID);

            if (!meetingUUID)
                socket.emit('error', {
                    message: 'Meeting UUID cannot be blank',
                    code: 400,
                });

            if (!room) {
                room = meetingUUID;
                socket.join(room);
                dbgWS(`${socket.id} joined room ${room}`);
            }

            if (rooms.has(room))
                io.to(socket.id).emit('update', rooms.get(room));
        });

        socket.on(
            'sendUpdate',
            ({ participants, topic, color, meetingUUID }) => {
                if (!meetingUUID) {
                    const message = 'Meeting UUID cannot be blank';
                    dbgWS('error', message);
                    return socket.emit('error', {
                        message,
                        code: 400,
                    });
                }

                if (!room) {
                    room = meetingUUID;
                    socket.join(room);
                }

                let data = {};
                const roomExists = rooms.has(room);
                if (roomExists) data = rooms.get(room);

                const changes = {
                    topic: topic && data.topic !== topic,
                    participants: participants && data.participants !== topic,
                    color: color && data.color !== color,
                };

                if (changes.topic) data.topic = topic;

                if (changes.participants) data.participants = participants;

                if (changes.color) data.color = color;

                rooms.set(room, data);
                dbgWS(
                    `sending update from socket ${socket.id} to room ${room}`
                );
                socket.to(room).emit('update', data);
            }
        );
    });
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
