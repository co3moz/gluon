module.exports = function RecursiveSearch(obj, models) {
    Object.keys(obj).forEach(function (key) {
        var value = obj[key];

        if (value.constructor == String) {
            if (value.indexOf("@@@") != 0) {
                continue;
            }

            value = value.substring(3);

            if (models[value]) {
                obj[key] = models[value];
            }

        } else if (value.constructor == Object) {
            RecursiveSearch(value, models);
        }
    });
}