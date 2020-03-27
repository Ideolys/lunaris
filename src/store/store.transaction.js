var exportsLunaris = require('../exports.js');
var logger         = require('../logger.js');

/**
 * Begin a store transaction
 * @return {Function} rollback
 */
function begin () {
  return logger.deprecated('lunaris.begin has been removed!');
}

/**
 * Commit a transaction
 * @param {Function} callback
 */
function commit (callback) {
  return logger.deprecated('lunaris.commit has been removed!');
}

module.exports = {
  begin  : begin,
  commit : commit
};
