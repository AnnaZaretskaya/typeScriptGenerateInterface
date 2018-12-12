interface IDictionary {
    [id: string]: any[];
}

function generateInterface(object: any):string {
    function stringify(object: any, tab: number):string {
        let iteration: number = -1;
        let tabs: string = '\t'.repeat(tab + 1);
        let resultStringify: string = '';
        let resStringifyArray: string = '';
        let currentType: string[][] = [];
        let configIteration: number = -1;
        let allKeys: string[][] = [];
        let config: IDictionary[] = [];
        let requiredKeys: string[][] = [];
        const debugMode: boolean = false;

        Object.keys(object).forEach((key: string) => {
            let property: any = object[key];
            let tempType: string;
            switch (typeof property) {
                case 'undefined':
                    tempType = 'any';
                    break;
                case 'object':
                    if (property instanceof Array) {
                        resStringifyArray = '';
                        tempType = stringifyArray(property, tab, iteration + 1);
                    } else if (property instanceof Date) {
                        tempType = 'Date';
                    } else if (property instanceof Object) {
                        tempType = stringify(property, tab + 1);
                    } else if (property === null) {
                        tempType = 'any';
                    }
                    break;
                default:
                    tempType = typeof property;
            }
            resultStringify += `${tabs}${key}: ${tempType};\n`;
        });

        function stringifyArray(array: any[], tab: number, iteration: number, nextConfigIteration: boolean = false) {
            let resObjectsInArrays: string;
            currentType[iteration] = [];

            if (array.length === 0) {
                return 'any[]';
            }

            if (nextConfigIteration) {
                configIteration++;
            }

            array.forEach((arrayElement:any, i: number) => {
                switch (typeof arrayElement) {
                    case 'undefined':
                        currentType[iteration][i] = 'any';
                        break;
                    case 'object':
                        if (arrayElement instanceof Array) {
                            currentType[iteration][i] = 'array';
                        } else if (arrayElement instanceof Date) {
                            currentType[iteration][i] = 'Date';
                        } else if (arrayElement instanceof Object) {
                            currentType[iteration][i] = 'object';
                        } else if (arrayElement === null) {
                            currentType[iteration][i] = 'any';
                        }
                        break;
                    default:
                        currentType[iteration][i] = typeof arrayElement;
                }
            });

            function uniq(array: string[]): string[] {
                if (array.length === 0) {
                    return [];
                }
                let uniqueResult: string[] = [];

                array.forEach((arrayElement: string) => {
                    let isUniqEl: boolean = !(uniqueResult.some((element: any) => element === arrayElement));

                    if (isUniqEl) {
                        uniqueResult.push(arrayElement);
                    }
                });
                return uniqueResult;
            }

            function mergeArrays(bigArray: any[]): any[] {
                let merged: any[] = [];
                bigArray.forEach((smallArray: any) => {
                    merged.push(...smallArray);
                });
                return merged;
            }

            function hasJustObjects(types: string[]): boolean {
                return ((uniq(types).length === 1) && (types.includes('object')))
            }

            function hasJustArrays(types: string[]): boolean {
                return ((uniq(types).length === 1) && (types.includes('array')))
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
                return `${stringifyObjectsInArrays(array, tab, configIteration)}[]`;
            } else if (hasJustArrays(currentType[iteration])) {

                if (nextConfigIteration) {
                    currentType[iteration] = mergeArrays(array);
                    return `${stringifyArray(currentType[iteration], tab, iteration)}[]`;

                }

                array.forEach((element: any[], index: number) => {

                    if (element.length === 0) {
                        currentType[iteration][index] = 'any[]';
                        return;
                    }

                    currentType[iteration][index] = stringifyArray(element, tab, iteration + 1);
                });

                currentType[iteration] = uniq(currentType[iteration]);

                if (currentType[iteration].length === 1) {
                    return `${currentType[iteration][0]}[]`;
                }

                return `(${currentType[iteration].join('|')})[]`;

            } else {
                array.forEach((element: any, index:  number) => {

                    if (element instanceof Array) {
                        if (element.length === 0) {
                            currentType[iteration][index] = 'any[]';
                            return;
                        }
                        currentType[iteration][index] = stringifyArray(element, tab, iteration + 1);
                    } else if ((element instanceof Object) && !(element instanceof Date)) {
                        if (Object.keys(element).length === 0) {
                            currentType[iteration][index] = '{}';
                            return;
                        }
                        currentType[iteration][index] = stringify(element, tab + 1);
                    }
                });
                currentType[iteration] = uniq(currentType[iteration]);

                if (currentType[iteration].length === 1) {
                    return `${currentType[iteration][0]}[]`;
                }

                return `(${currentType[iteration].join('|')})[]`;
            }

            function stringifyObjectsInArrays(array: any[], tab: number, configIteration: number): string {
                resObjectsInArrays = '';
                requiredKeys[configIteration] = Object.keys(array[0]);
                allKeys[configIteration] = [];
                config[configIteration] = {};

                array.forEach((objectInArray: any) => {
                    if (Object.keys(objectInArray).length === 0) {
                        requiredKeys[configIteration] = [];

                        return;
                    }

                    requiredKeys[configIteration].forEach((key: string, index: number, reqKeys: any[]) => {
                        if (Object.keys(objectInArray).indexOf(key) === -1) {
                            reqKeys.splice(index, 1);
                        }
                    });

                    allKeys[configIteration] = allKeys[configIteration].concat(Object.keys(objectInArray));
                });

                allKeys[configIteration] = uniq(allKeys[configIteration]);

                allKeys[configIteration].forEach((key: string) => {
                    config[configIteration][key] = [];
                });

                array.forEach((obj: any) => {
                    Object.keys(obj).forEach((key: string) => {
                        config[configIteration][key].push(obj[key]);
                    });
                });

                Object.keys(config[configIteration]).forEach((key: string) => {
                    iteration = iteration + 1;
                    config[configIteration][key] = stringifyArray(config[configIteration][key], tab + 1, iteration, true);
                    config[configIteration][key] = config[configIteration][key].slice(0, config[configIteration][key].length - 2);
                    if (requiredKeys[configIteration].indexOf(key) === -1) {
                        let reqKey = `${key}?`;

                        config[configIteration][reqKey] = config[configIteration][key];
                        delete config[configIteration][key];
                    }
                });

                resObjectsInArrays = `{\n`;

                Object.keys(config[configIteration]).forEach((key: string) => {
                    resObjectsInArrays += `${'\t'.repeat(tab + 1)}\t${key}: ${config[configIteration][key]};\n`;
                });

                resObjectsInArrays += `${'\t'.repeat(tab + 1)}}`;

                return resObjectsInArrays;
            }
        }

        return `{\n${resultStringify}${'\t'.repeat(tab)}}`;
    }

    return `declare interface IObj ${stringify(object, 0)};`;
}






