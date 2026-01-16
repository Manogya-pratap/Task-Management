const taskEvents = require('./taskEvents');
const projectEvents = require('./projectEvents');

module.exports = {
  ...taskEvents,
  ...projectEvents
};
