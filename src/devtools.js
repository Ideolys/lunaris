/**
 * Send data to devtools
 * @param {*} data
 */
function send (data) {
  var event = new CustomEvent('lunaris-devtools', {
    detail : data
  });
  window.dispatchEvent(event);
}

module.exports = {
  send : send
};
