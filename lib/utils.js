module.exports = {
  /**
   * Create a queue.
   *
   * start() must be called to start the queue.
   * It can be called multiple times without breaking the queue.
   * If the queue is already running, it does not start again
   *
   * @param {Array} items to process
   * @param {Function} handlerItem handler(item, callback) function to process the async
   * @param {Function} handlerError handler(err) function to process errors
   * @param {Function} callback  function to call when queue is finished
   * @param {Object} [options] optionnal options object
   */
  genericQueue : function (items = [], handlerItem, handlerError, callback, options = {}) {

    return {
      items       : items,
      currentItem : null,
      isRunning   : false,

      /**
       * Process next item in the queue
       * internal function
       * @param {*} err
       */
      processNextItem : function (err) {
        if (handlerError && err) {
          handlerError(err);

          if (options.stopOnError === true) {
            return;
          }
        }

        if (this.items.length === 0) {
          this.isRunning = false;
          if (callback) {
            return callback();
          }
          return;
        }

        this.currentItem = this.items.shift();
        handlerItem.call(this, this.currentItem, this.processNextItem.bind(this));
      },

      /**
       * Start queue process
       */
      start : function () {
        if (this.isRunning === false) {
          this.isRunning = true;
          this.processNextItem();
        }
      }
    };
  }
};
