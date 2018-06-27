exports.clone = function clone (value) {
  return JSON.parse(JSON.stringify(value));
};
