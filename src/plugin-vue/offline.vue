<template>
  <div id="app-lunaris" class="container has-text-light" style="padding: 1.5rem;">

    <div v-if="currentComponent === 'home'">
      <div>
        <h3 class="title is-3 has-text-light" style="margin-top: 3rem">${Synchronization}</h3>
        <p class="subtitle has-text-light">${It seems that you have local data that you need to push to the server}</p>
      </div>
      <div class="columns" style="margin-top: 2rem">
        <div class="column is-half">
          <progress style="margin-bottom: .4rem" class="progress is-small" :value="waitBeforeSync" max="4"></progress>
          <span>{{ waitBeforeSync }}s ${before synchronization}</span>
        </div>
      </div>
      <div>
        <h3 class="has-text-light subtitle subtitle-is-3" style="margin-top: 2rem">{{ getNumberOfOfflineTransactions() }} ${action(s) to synchronize}</h3>
        <div v-for="transaction in $lunarisOfflineTransactions" :key="transaction.id" style="padding-bottom: .3rem">
          <b-icon
            icon="circle"
            size="is-small">
          </b-icon>
          <span style="margin-left: .8rem">
            {{ getNumberOfItemsToSyncByTransaction(transaction) }} {{ getStoreName(transaction.store) }} ${toVerb} {{ methods[transaction.method] }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="currentComponent === 'sync'">
      <h3 class="title is-3 has-text-light" style="margin-top: 3rem">${Synchronizing}</h3>

      <progress style="margin-bottom: .4rem" class="progress is-small" :value="nbOfflineTransactionsPushed" :max="getNumberOfOfflineTransactions"></progress>
      <span>{{ nbOfflineTransactionsPushed }} ${action(s) synchronized}</span>
    </div>

    <div v-if="currentComponent === 'success'">
      <b-icon
        style="margin-top: 3rem; font-size: 6em; display : block; text-align: center; width: 100%; height: 100%"
        icon="check-circle"
        size="is-large">
      </b-icon>
      <h3 class="title is-3 has-text-light" style="text-align: center; margin-top: .8rem">${Synchronized}</h3>
    </div>

    <div v-if="currentComponent === 'error'">
      <h3 class="title is-3 has-text-light">
        <b-icon
          class="has-text-red"
          style="margin-top: 3rem; margin-right: .8rem"
          icon="times">
        </b-icon>
        ${An error occured}
      </h3>
      <div>
        <p class="subtitle is-4 has-text-light">${The following action(s) have not been synchronized}</p>
        <div v-for="transaction in $lunarisOfflineTransactions" :key="transaction.id" style="padding-bottom: .3rem">
          <b-icon
            icon="circle"
            size="is-small">
          </b-icon>
          <span style="margin-left: .8rem">
            {{ getNumberOfItemsToSyncByTransaction(transaction) }} {{ getStoreName(transaction.store) }} ${toVerb} {{ methods[transaction.method] }}
          </span>
        </div>
        <div style="margin-top: 2rem">
          <button class="button is-danger" style="margin-right: .3rem" @click="abort">${Abort}</button>
          <button class="button is-primary" @click="sync">${Retry}</button>
        </div>
      </div>
    </div>

    <div v-if="currentComponent === 'syncLoad'">
      <h3 class="title is-3 has-text-light" style="margin-top: 3rem">${Synchronizing data}</h3>
      <progress style="margin-bottom: .4rem" class="progress is-small" :value="nbStoresLoaded" :max="nbStoresToLoad"></progress>
    </div>
  </div>
</template>

<script>
  /**
   * Load filters before loading stores
   * @param {Array} storesToLoad
   */
  function loadFilters (storesToLoad, callback) {
    lunaris.begin();
    for (var i = 0; i < storesToLoad.length; i++) {
      if (!storesToLoad[i].filters) {
        continue;
      }

      if (!Array.isArray(storesToLoad[i].filters)) {
        continue;
      }

      for (var j = 0; j < storesToLoad[i].filters.length; j++) {
        if (storesToLoad[i].filters[j][1] === false) {
          lunaris.clear(storesToLoad[i].filters[j][0]);
          continue;
        }

        lunaris.upsert(storesToLoad[i].filters[j][0], storesToLoad[i].filters[j][1]);
      }
    }
    lunaris.commit(callback);
  }

  /**
   * Get hook handler to count loaded events
   * @param {Object} that = this = vm
   * @param {String} store ex: '@store'
   */
  function getHook(that, store) {
    var hook = function () {
      that.nbStoresLoaded++;
      lunaris.removeHook('loaded' + store, hook);
    };

    return hook;
  }

  module.exports = {
    el   : '#app',
    name : 'offline-sync',
    data : function () {
      return {
        currentComponent : 'home',
        methods          :  {
          GET    : '${load}',
          PUT    : '${edit}',
          POST   : '${create}',
          DELETE : '${delete}'
        },

        waitBeforeSync              : 4,
        intervalWaitBeforeSync      : null,

        nbOfflineTransactionsPushed        : 0,
        nbOfflineTransactionsPushedInError : 0,

        isOfflineModeActivated : lunaris.offline.isOfflineMode,

        nbStoresLoaded : 0,
        nbStoresToLoad : 0,

        defaultWaitTime : 800
      }
    },
    stores     : ['lunarisOfflineTransactions'],
    storeHooks : {
      'get@lunarisOfflineTransactions' : function (items) {
        if (!items.length) {
          this.currentComponent = 'syncLoad';
          return this.onPushOfflineTransactionEnd();
        }

        var _this = this;
        this.intervalWaitBeforeSync = setInterval(function () {
          _this.waitBeforeSync -= 1;

          if (!_this.waitBeforeSync) {
            clearInterval(_this.intervalWaitBeforeSync);
            _this.sync();
          }
        }, 1000);
      },
      'syncSuccess@lunarisOfflineTransactions' : function () {
        this.nbOfflineTransactionsPushed++;
      },
      'syncError@lunarisOfflineTransactions' : function () {
        this.nbOfflineTransactionsPushed++;
        this.nbOfflineTransactionsPushedInError++;
      }
    },

    mounted : function () {
      lunaris.invalidate('lunarisOfflineTransactions');
      lunaris.setPagination('@lunarisOfflineTransactions', 0, 500);
      lunaris.get('@lunarisOfflineTransactions');
    },

    methods : {
      /**
       * @param {String} store
       */
      getStoreName : function (store) {
        return lunaris.utils.getTranslatedStoreName(store).toLowerCase();
      },

      getNumberOfOfflineTransactions : function () {
        if (this.$lunarisOfflineTransactions.length > 99) {
          return '99+';
        }

        return this.$lunarisOfflineTransactions.length;
      },

      /**
       * @param {Object} transaction object from lunaris offline store
       */
      getNumberOfItemsToSyncByTransaction : function (transaction) {
        if (!Array.isArray(transaction.data)) {
          return 1;
        }

        return transaction.data.length;
      },

      sync : function () {
        var _this                               = this;
        this.currentComponent                   = 'sync';
        this.nbOfflineTransactionsPushed        = 0;
        this.nbOfflineTransactionsPushedInError = 0;
        lunaris.offline.isOfflineMode           = false;
        lunaris.offline.pushOfflineHttpTransactions(function () {
          // add time to slow down retries
          setTimeout(function () {
            _this.onPushOfflineTransactionEnd();
          }, this.defaultWaitTime);
        });
      },

      abort : function () {
        lunaris.clear(lunaris.utils.offlineStore);
        this.onEnd();
      },

      onEnd : function () {
        this.currentComponent = 'success';
        // Wait before unmount offline app
        setTimeout(function () {
          lunaris._vue._isVueOffline = false;
          lunaris._vue._unmountApp(lunaris._vue._vmOffline);
          lunaris._vue.run();
        }, this.defaultWaitTime);
      },

      /**
       * Sync filters to load
       */
      onPushOfflineTransactionEnd : function () {
        lunaris.offline.isOfflineMode = this.isOfflineModeActivated;

        if (this.nbOfflineTransactionsPushedInError === 0) {
          this.loadStores();
          return;
        }

        this.currentComponent = 'error';
      },

      /**
       * Load stores for offline mode
       */
      loadStores : function () {
        var storesToLoad = lunaris._vue._storesToLoad;

        if (!storesToLoad.length || !this.isOfflineModeActivated) {
          return this.onEnd();
        }

        this.nbStoresToLoad = storesToLoad.length;

        lunaris.offline.isSynchronizing = true;

        // Compute invalidations before loading stores
        lunaris.invalidations.getAndCompute();

        var _that = this;
        // First, init filters
        loadFilters(storesToLoad, function () {
          // Then load
          lunaris.begin();
          for (var i = 0; i < _that.nbStoresToLoad; i++) {
            lunaris.load(storesToLoad[i].store, storesToLoad[i].options);
            lunaris.hook('loaded' + storesToLoad[i].store, getHook(_that, storesToLoad[i].store));
          }

          lunaris.commit(function () {
            lunaris.offline.isSynchronizing = false;
            _that.currentComponent = 'success';
            _that.onEnd();
          });
        });
      }
    }
  };
</script>
