<template>
  <div class="lunaris-errors-resolver">
    <h6 class="title is-4">Résolution d'erreurs</h6>

    <div>
      <div class="card" v-for="lunarisError in $lunarisErrors" :key="lunarisError._id">
        <div class="card-content">
          <div class="content">
            <p>{{ getDate(lunarisError.date) }}</p>
            <p><b>{{ lunarisError.messageError }}</b></p>
            <p>
              ${Details} :
              {{ lunarisError.messageErrorServer }}
            </p>
          </div>
        </div>
        <footer class="card-footer">
          <a class="card-footer-item" @click="onCancel(lunarisError)">${Cancel}</a>
          <a class="card-footer-item" @click="onRetry(lunarisError)">${Retry}</a>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>
  function removeElement(el) {
    if (typeof el.remove !== 'undefined') {
      el.remove();
    } else {
      el.parentNode.removeChild(el);
    }
  }

  var lunarisErrorsResolver = {
    name   : 'lunaris-errors-resolver',
    stores : ['lunarisErrors'],
    data   : function () {
      return {}
    },

    methods : {
      /**
       * Return fromatted date
       * @param {Object} date dayjs date object
       */
      getDate : function (date) {
        if (!dayjs.isDayjs(date)) {
          date = dayjs(date);
        }
        return date.format('LLL');
      },

      /**
       * On click cancel button
       */
      onCancel : function (lunarisError) {
        this._removeFromStore(lunarisError);
        this.$rollback(lunarisError);
      },

      /**
       * On click retry button
       */
      onRetry : function (lunarisError) {
        this._removeFromStore(lunarisError);
        lunaris.retry(
          lunarisError.storeName,
          lunarisError.url,
          lunarisError.method,
          lunarisError.data,
          lunarisError.version
        );
      },

      _removeFromStore : function (lunarisError) {
        lunaris._vue._vm.$data.nbSnackbars--;
        lunaris.delete('@lunarisErrors', lunarisError);
        if (!this.$lunarisErrors.length) {
          this.$destroy();
          removeElement(this.$el);
          this.$lunarisErrorsResolver.isOpened = false;
        }
      }
    },

    mounted : function () {
      lunaris.get('@lunarisErrors');
    }
  };

  var _comp = Vue.extend(lunarisErrorsResolver);
  Vue.prototype.$lunarisErrorsResolver = {
    isOpened : false,
    open     : function (params) {
      this.isOpened  = true;
      var _component = new _comp().$mount();
      document.getElementById('lunaris-errors-resolver').appendChild(_component.$el);
    }
  };
</script>
