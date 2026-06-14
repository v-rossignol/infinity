import { io, Socket } from 'socket.io-client';

export const connectSocket = (port: number, token?: string): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    });

    const onError = (error: Error) => {
      socket.off('connect', onConnect);
      reject(error);
    };

    const onConnect = () => {
      socket.off('connect_error', onError);
      resolve(socket);
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });

export const waitForSocketEvent = <T>(
  socket: Socket,
  event: string,
  timeoutMs = 10_000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);

    socket.once(event, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

export const emitAndWaitFor = async <TRequest, TResponse>(
  socket: Socket,
  emitEvent: string,
  payload: TRequest,
  responseEvent: string,
): Promise<TResponse> => {
  const responsePromise = waitForSocketEvent<TResponse>(socket, responseEvent);
  socket.emit(emitEvent, payload);
  return responsePromise;
};
