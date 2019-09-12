<template>
  <div id="app-lunaris" class="container has-text-light">

    <div v-if="currentComponent === 'home'">
      <div>
        <h3 class="title is-3 has-text-light" style="margin-top: 3rem">${Synchronization}</h3>
        <p class="subtitle has-text-light">${It seems that you have local data that you need to push to the server}</p>
      </div>
      <div class="columns" style="margin-top: 2rem">
        <div class="column is-half">
          <progress style="margin-bottom: .4rem" class="progress is-small" :value="waitBeforeSync" max="15"></progress>
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
  </div>
</template>

<script>
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

        waitBeforeSync              : 6,
        intervalWaitBeforeSync      : null,

        nbOfflineTransactionsPushed        : 0,
        nbOfflineTransactionsPushedInError : 0,

        isOfflineModeActivated : lunaris.offline.isOfflineMode
      }
    },
    stores  : ['lunarisOfflineTransactions'],
    created : function () {
      lunaris.setPagination('lunarisOfflineTransactions', 0, 500);
      lunaris.get('@lunarisOfflineTransactions');
    },

    mounted : function () {
      var _this = this;
      this.intervalWaitBeforeSync = setInterval(function () {
        _this.waitBeforeSync -= 1;

        if (!_this.waitBeforeSync) {
          clearInterval(_this.intervalWaitBeforeSync);
          _this.sync();
        }
      }, 1000);
    },

    storeHooks : {
      'syncSuccess@lunarisOfflineTransactions' : function () {
        this.nbOfflineTransactionsPushed++;
      },
      'syncError@lunarisOfflineTransactions' : function () {
        this.nbOfflineTransactionsPushed++;
        this.nbOfflineTransactionsPushedInError++;
      }
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
        var _this = this;
        this.currentComponent = 'sync';
        this.nbOfflineTransactionsPushed        = 0;
        this.nbOfflineTransactionsPushedInError = 0;
        lunaris.offline.isOfflineMode           = false;
        lunaris.offline.pushOfflineHttpTransactions(function () {
          // add time in purpose to slow down reties
          setTimeout(function () {
            _this.onPushOfflineTransactionEnd();
          }, 300);
        });
      },

      abort : function () {
        lunaris.clear(lunaris.utils.offlineStore);
        this.onEnd();
      },

      onEnd : function () {
        lunaris.offline.isOfflineMode = this.isOfflineModeActivated;
        lunaris._vue._isVueOffline    = false;
        lunaris._vue._unmountApp(lunaris._vue._vmOffline);
        lunaris._vue.run();
      },

      onPushOfflineTransactionEnd : function () {
        if (this.nbOfflineTransactionsPushedInError === 0) {
          this.currentComponent = 'success';
          var _this = this;
          setTimeout(function () {
            _this.onEnd();
          }, 400);
          return;
        }

        this.currentComponent = 'error';
      }
    }
  };
</script>
