// eslint-disable-next-line no-unused-vars
onmessage = ({ data: { canvas, shape, width, height } }) => {};

onerror = ({ message }) => self.postMessage({ error: new Error(message) });
