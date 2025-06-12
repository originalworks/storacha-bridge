export const serializeError = (err) => ({
  name: err.name,
  message: err.message,
  stack: err.stack,
});
