#!/usr/bin/env node

/**
 * Module dependencies.
 */

import 'reflect-metadata'; // 必須在最前面導入
import app from '../app.js';
import debug from 'debug';
import http from 'http';
import { AppDataSource } from '../config/database.js';
import { scheduleConcertFinishJobs } from '../scheduler/concertScheduler.js';
import { scheduleOrderExpiredJobs } from '../scheduler/orderScheduler.js';

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr?.port;
  debug('Listening on ' + bind);
}

/**
 * Schedule for finishing concerts
 */

AppDataSource.initialize().then(async () => {
  console.log('啟動排程任務...');
  await scheduleConcertFinishJobs(); // 啟動排程任務

  console.log('啟動訂單逾期排程任務...');
  await scheduleOrderExpiredJobs(); // 啟動訂單逾期
});
