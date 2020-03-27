var isOnline        = true;  // detect if browser is online or offline
var isOfflineMode   = false; // is offline mode enabled ? invalidations are recived but not propagated
var isSynchronizing = false; // is synchronizing ?

if (typeof navigator !== 'undefined') {
  isOnline = navigator.onLine !== undefined ? navigator.onLine : true;

  window.addEventListener('online', function () {
    isOnline = true;
  });
  window.addEventListener('offline', function () {
    isOnline = false;
  });
}

module.exports = {
  /**
   * If isOfflineMode is true, offline = false even if we are really online
   */
  get isOnline () {
    if (isOfflineMode) {
      return false;
    }

    return isOnline;
  },
  get isRealOnline () {
    return isOnline;
  },
  set isOnline (value) {
    isOnline = value;
  },
  get isOfflineMode () {
    return isOfflineMode;
  },
  set isOfflineMode (value) {
    isOfflineMode = value;
  },
  get isSynchronizing () {
    return isSynchronizing;
  },
  set isSynchronizing (value) {
    isSynchronizing = value;
  }
};
