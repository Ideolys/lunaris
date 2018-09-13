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
                <p class="is-size-6">
                  {{ scale.label }}
                </p>
              </td>
            </tr>
            <tr>
              <td colspan=2>
                <p class="is-size-6 has-text-weight-bold">${Serial number}</p>
              </td>
              <td>
                <p class="is-size-6">{{ scale.serialNumber }}</p>
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
                <p class="is-size-6">
                  {{ scale.waste.label }}
                </p>
              </td>
            </tr>
            <tr>
              <td colspan=2>
                <p class="is-size-6 has-text-weight-bold">${Tare}</p>
              </td>
              <td>
                <p class="is-size-6">{{ scale.tare.toFixed(2) }}&nbsp;${kg}</p>
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
  name  : 'scale-details',
  props : ['scale']
};
</script>
