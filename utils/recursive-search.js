module.exports = function RecursiveSearch(obj, models) {
    if (obj == null) {
        return;
    }

    Object.keys(obj).forEach(function (key) {
        if (obj[key] == null) return;

        var value = obj[key];

        if (value.constructor == String) {
            if (value.indexOf("@@@") != 0) return;

            var value = value.substring(3);

            if (models[value]) {
                obj[key] = models[value];
            }
        } else if(value.constructor == Object || value.constructor == Array) {
            RecursiveSearch(value, models);
        }
    });
}