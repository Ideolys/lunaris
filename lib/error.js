const COLORS = {
  DEFAULT : '\x1b[0m',
  CYAN    : '\x1b[36m',
  WHITE   : '\x1b[37m',
  RED     : '\x1b[31m'
};

module.exports = {
  /**
   * Print error
   * @param {String} id
   * @param {Error/Array} errors
   */
  print : function print (id, errors) {
    if (!Array.isArray(errors)) {
      errors = [errors];
    }

    console.log('\n' + COLORS.RED + '[Builder] [Error] ' + id);
    console.log('=========================================' + COLORS.DEFAULT);

    for (let i = 0; i < errors.length; i++) {
      console.log(' - ' + errors[i].message);
    }
  }
};
