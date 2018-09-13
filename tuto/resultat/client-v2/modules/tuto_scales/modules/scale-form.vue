<template>
  <div>
    <b-collapse class="panel is-marginless">
      <div slot="trigger" class="panel-heading has-text-centered">
        <p>
          ${Information}
        </p>
      </div>
      <div class="panel-block">
        <table class="table is-fullwidth">
          <tbody>
            <tr>
              <td colspan="2">
                <p class="is-size-6 has-text-weight-bold">${Label}</p>
              </td>
              <td>
                <input class="input" type="text" v-model="scale.label" required>
              </td>
            </tr>
            <tr>
              <td colspan=2>
                <p class="is-size-6 has-text-weight-bold">${Serial number}</p>
              </td>
              <td>
                <input class="input" type="text" v-model="scale.serialNumber" required>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </b-collapse>
    <b-collapse class="panel is-marginless">
      <div slot="trigger" class="panel-heading has-text-centered">
        <p>
          ${Settings}
        </p>
      </div>
      <div class="panel-block">
        <table class="table is-fullwidth">
          <tbody>
            <tr>
              <td colspan="2">
                <p class="is-size-6 has-text-weight-bold">${Waste}</p>
              </td>
              <td>
                <div class="columns">
                  <div class="column is-11">
                    <b-field>
                        <b-autocomplete
                            v-model="scale.waste.label"
                            placeholder="${Waste}"
                            :keep-first="true"
                            :open-on-focus="true"
                            :data="wastes"
                            field="label"
                            @select="selectWaste">
                        </b-autocomplete>
                    </b-field>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td colspan=2>
                <p class="is-size-6 has-text-weight-bold">${Tare}</p>
              </td>
              <td>
                <input class="input" type="number" v-model="scale.tare" required>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </b-collapse>
  </div>
</template>
<script>
module.exports = {
  name  : 'scale-form',
  props : ['scale', 'wastes'],
  created : function () {
  },
  methods : {
    selectWaste : function (option) {
      console.log(option);
      this.scale.waste.id = option.id;
    }
  }
};
</script>
