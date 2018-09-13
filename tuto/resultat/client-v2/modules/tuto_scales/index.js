module.exports = {
  name       : 'tuto_scales',
  template   : 'index.html',
  stores     : ['tutoScales', 'tutoWastes'],
  components : {
    'scale-details' : require('modules/scale-details.vue'),
    'scale-form'    : require('modules/scale-form.vue'),
  },
  data : function () {
    return {
      currentOpenedScale : null,
      editScale          : null,
      formErrors         : []
    };
  },
  created : function () {
    this.$refs.scalesRef = {};
    lunaris.get('@tutoScales');
    lunaris.upsert('@tutoWastes.filter.date', {date : dayjs().format('YYYY-MM-DD')});
    this.site = lunaris.getOne('@currentSite');
  },
  methods : {
    toggleRightPanel : function (scale) {
      if (this.currentOpenedScale && scale._id === this.currentOpenedScale._id) {
        this.currentOpenedScale = null;
        this.$refs.scalesRef.closeRightPanel();
        return;
      }
      this.currentOpenedScale = scale;
      this.$refs.scalesRef.openRightPanel();
    },
    closeRightPanel : function () {
      this.$refs.scalesRef.closeRightPanel();
      this.currentOpenedScale = null;
      this.editScale = null;
    },
    openAddForm : function (scale) {
      if (scale) {
        this.editScale = lunaris.clone(scale);
      } else {
        this.editScale = lunaris.getDefaultValue('@tutoScales');
      }
      this.currentOpenedScale = null;
      this.$refs.scalesRef.openRightPanel();
    },
    saveOrUpdate : function () {
      var _this = this;

      this.editScale.idSiteOwner = this.site.id;
      this.editScale.tare = parseFloat(this.editScale.tare);
      lunaris.validate('@tutoScales', this.editScale, function (isValid, err) {
        if (!isValid) {
          _this.formErrors = err;
          return;
        }

        lunaris.upsert('@tutoScales', _this.editScale);
        _this.$nextTick(function () {
          lunaris.clear('@tutoScales');
        });
        _this.closeRightPanel();
      });
    }
  }
};
