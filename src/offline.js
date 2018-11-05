var lunarisExports = require('./exports.js');
var isOnline       = true;

module.exports = {
  get isOnline () {
    return isOnline;
  },
  set isOnline (value) {
    isOnline = value;
  }
};

if (lunarisExports.isBrowser) {
  isOnline = Navigator.onLine || true;

  window.addEventListener('online', function () {
    isOnline = true;
  });
  window.addEventListener('offline', function () {
    isOnline = false;
  });
}
