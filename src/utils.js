exports.clone = function clone (value) {
  return Object.freeze(JSON.parse(JSON.stringify(value)));
};
