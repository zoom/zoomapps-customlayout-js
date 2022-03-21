import { createServer } from 'http';
import { Server } from 'socket.io';
import debug from 'debug';
import { appName } from '../config.js';

const dbg = debug(`${appName}:http`);
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
                dbg(`${socket.id} joined room ${room}`);
            }

            if (rooms.has(room)) {
                const data = rooms.get(room);
                dbg(`joined with data ${JSON.stringify(data)}`);
                io.to(socket.id).emit('update', rooms.get(room));
            }
        });

        socket.on(
            'sendUpdate',
            ({ participants, topic, color, meetingUUID }) => {
                dbg('update evt', participants, topic, color, meetingUUID);
                if (!meetingUUID)
                    socket.emit('error', {
                        message: 'Meeting UUID cannot be blank',
                        code: 400,
                    });

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
                dbg(`sending update from ${socket.id} to ${room}`, room, data);
                socket.to(room).emit('update', data);
            }
        );
    });

    io.of('/').adapter.on('create-room', (room) => {
        console.log(`Socket.IO: Room '${room}' was created`);
    });

    io.of('/').adapter.on('delete-room', (room) => {
        dbg(`Deleting room ${room}`);
        if (rooms.has(room)) rooms.delete(room);
    });

    io.of('/').adapter.on('join-room', (room) => {
        console.log(`Socket.IO: socket has joined room '${room}'`);
    });

    io.of('/').adapter.on('leave-room', (room) => {
        console.log(`Socket.IO: socket has left room '${room}'`);
    });
}

/**
 * Start the HTTP server
 * @param app - Express app to attach to
 * @param {String|number} port - local TCP port to serve from
 */
export async function startHTTP(app, port) {
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
