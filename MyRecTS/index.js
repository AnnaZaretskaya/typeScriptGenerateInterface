function generateInterface(object) {
    function stringify(object, tab) {
        var iteration = -1;
        var tabs = '\t'.repeat(tab + 1);
        var resultStringify = '';
        var resStringifyArray = '';
        var currentType = [];
        var configIteration = -1;
        var allKeys = [];
        var config = [];
        var requiredKeys = [];
        var debugMode = false;
        Object.keys(object).forEach(function (key) {
            var property = object[key];
            var tempType;
            switch (typeof property) {
                case 'undefined':
                    tempType = 'any';
                    break;
                case 'object':
                    if (property instanceof Array) {
                        resStringifyArray = '';
                        tempType = stringifyArray(property, tab, iteration + 1);
                    }
                    else if (property instanceof Date) {
                        tempType = 'Date';
                    }
                    else if (property instanceof Object) {
                        tempType = stringify(property, tab + 1);
                    }
                    else if (property === null) {
                        tempType = 'any';
                    }
                    break;
                default:
                    tempType = typeof property;
            }
            resultStringify += "" + tabs + key + ": " + tempType + ";\n";
        });
        function stringifyArray(array, tab, iteration, nextConfigIteration) {
            if (nextConfigIteration === void 0) { nextConfigIteration = false; }
            var resObjectsInArrays;
            currentType[iteration] = [];
            if (array.length === 0) {
                return 'any[]';
            }
            if (nextConfigIteration) {
                configIteration++;
            }
            array.forEach(function (arrayElement, i) {
                switch (typeof arrayElement) {
                    case 'undefined':
                        currentType[iteration][i] = 'any';
                        break;
                    case 'object':
                        if (arrayElement instanceof Array) {
                            currentType[iteration][i] = 'array';
                        }
                        else if (arrayElement instanceof Date) {
                            currentType[iteration][i] = 'Date';
                        }
                        else if (arrayElement instanceof Object) {
                            currentType[iteration][i] = 'object';
                        }
                        else if (arrayElement === null) {
                            currentType[iteration][i] = 'any';
                        }
                        break;
                    default:
                        currentType[iteration][i] = typeof arrayElement;
                }
            });
            function uniq(array) {
                if (array.length === 0) {
                    return [];
                }
                var uniqueResult = [];
                array.forEach(function (arrayElement) {
                    var isUniqEl = !(uniqueResult.some(function (element) { return element === arrayElement; }));
                    if (isUniqEl) {
                        uniqueResult.push(arrayElement);
                    }
                });
                return uniqueResult;
            }
            function mergeArrays(bigArray) {
                var merged = [];
                bigArray.forEach(function (smallArray) {
                    merged.push.apply(merged, smallArray);
                });
                return merged;
            }
            function hasJustObjects(types) {
                return ((uniq(types).length === 1) && (types.includes('object')));
            }
            function hasJustArrays(types) {
                return ((uniq(types).length === 1) && (types.includes('array')));
            }
            if (debugMode) {
                //console.log('  is',  );
                console.log('iteration is', iteration);
                console.log('currentType[iteration] is', currentType[iteration]);
                console.log('hasJustObjects is', hasJustObjects(currentType[iteration]));
                console.log('hasJustArrays is', hasJustArrays(currentType[iteration]));
            }
            if (hasJustObjects(currentType[iteration])) {
                configIteration++;
                return stringifyObjectsInArrays(array, tab, configIteration) + "[]";
            }
            else if (hasJustArrays(currentType[iteration])) {
                if (nextConfigIteration) {
                    currentType[iteration] = mergeArrays(array);
                    return stringifyArray(currentType[iteration], tab, iteration) + "[]";
                }
                array.forEach(function (element, index) {
                    if (element.length === 0) {
                        currentType[iteration][index] = 'any[]';
                        return;
                    }
                    currentType[iteration][index] = stringifyArray(element, tab, iteration + 1);
                });
                currentType[iteration] = uniq(currentType[iteration]);
                if (currentType[iteration].length === 1) {
                    return currentType[iteration][0] + "[]";
                }
                return "(" + currentType[iteration].join('|') + ")[]";
            }
            else {
                array.forEach(function (element, index) {
                    if (element instanceof Array) {
                        if (element.length === 0) {
                            currentType[iteration][index] = 'any[]';
                            return;
                        }
                        currentType[iteration][index] = stringifyArray(element, tab, iteration + 1);
                    }
                    else if ((element instanceof Object) && !(element instanceof Date)) {
                        if (Object.keys(element).length === 0) {
                            currentType[iteration][index] = '{}';
                            return;
                        }
                        currentType[iteration][index] = stringify(element, tab + 1);
                    }
                });
                currentType[iteration] = uniq(currentType[iteration]);
                if (currentType[iteration].length === 1) {
                    return currentType[iteration][0] + "[]";
                }
                return "(" + currentType[iteration].join('|') + ")[]";
            }
            function stringifyObjectsInArrays(array, tab, configIteration) {
                resObjectsInArrays = '';
                requiredKeys[configIteration] = Object.keys(array[0]);
                allKeys[configIteration] = [];
                config[configIteration] = {};
                array.forEach(function (objectInArray) {
                    if (Object.keys(objectInArray).length === 0) {
                        requiredKeys[configIteration] = [];
                        return;
                    }
                    requiredKeys[configIteration].forEach(function (key, index, reqKeys) {
                        if (Object.keys(objectInArray).indexOf(key) === -1) {
                            reqKeys.splice(index, 1);
                        }
                    });
                    allKeys[configIteration] = allKeys[configIteration].concat(Object.keys(objectInArray));
                });
                allKeys[configIteration] = uniq(allKeys[configIteration]);
                allKeys[configIteration].forEach(function (key) {
                    config[configIteration][key] = [];
                });
                array.forEach(function (obj) {
                    Object.keys(obj).forEach(function (key) {
                        config[configIteration][key].push(obj[key]);
                    });
                });
                Object.keys(config[configIteration]).forEach(function (key) {
                    iteration = iteration + 1;
                    config[configIteration][key] = stringifyArray(config[configIteration][key], tab + 1, iteration, true);
                    config[configIteration][key] = config[configIteration][key].slice(0, config[configIteration][key].length - 2);
                    if (requiredKeys[configIteration].indexOf(key) === -1) {
                        var reqKey = key + "?";
                        config[configIteration][reqKey] = config[configIteration][key];
                        delete config[configIteration][key];
                    }
                });
                resObjectsInArrays = "{\n";
                Object.keys(config[configIteration]).forEach(function (key) {
                    resObjectsInArrays += '\t'.repeat(tab + 1) + "\t" + key + ": " + config[configIteration][key] + ";\n";
                });
                resObjectsInArrays += '\t'.repeat(tab + 1) + "}";
                return resObjectsInArrays;
            }
        }
        return "{\n" + resultStringify + '\t'.repeat(tab) + "}";
    }
    return "declare interface IObj " + stringify(object, 0) + ";";
}
