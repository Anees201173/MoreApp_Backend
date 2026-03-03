const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const config = require('../config/config');
const User = require('../models/User');

let ioInstance = null;

const extractToken = (socket) => {
  const fromAuth = socket?.handshake?.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth.trim()) return fromAuth.trim();

  const fromQuery = socket?.handshake?.query?.token;
  if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery.trim();

  const authHeader = socket?.handshake?.headers?.authorization;
  if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  return null;
};

const initSocket = (httpServer) => {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) return next(new Error('Not authorized'));

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findByPk(decoded?.id, {
        attributes: ['id', 'role', 'is_active', 'name', 'username', 'email'],
      });

      if (!user) return next(new Error('Not authorized'));
      if (!user.is_active) return next(new Error('Account deactivated'));

      socket.data.user = user.toJSON ? user.toJSON() : user;
      return next();
    } catch (err) {
      return next(new Error('Not authorized'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const user = socket.data?.user;
    if (user?.role) socket.join(`role:${user.role}`);
    if (user?.id) socket.join(`user:${user.id}`);
  });

  return ioInstance;
};

const getIO = () => ioInstance;

module.exports = { initSocket, getIO };
