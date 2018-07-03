exports.clone = function clone (value) {
  return JSON.parse(JSON.stringify(value));
};
exports.freeze = function freeze (value) {
  return Object.freeze(value);
};
