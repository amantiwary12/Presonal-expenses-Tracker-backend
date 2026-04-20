//logger config
const logger = (message) => {
  console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
};

export default logger;