(function() {
    const TypeConfig = { MULTI_TYPE: 'MULTI_TYPE', OBJECT: 'OBJECT', ARRAY: 'ARRAY' };
    const TAB = '  ';
    const debugMode = false;

    //region Utils

    const isArray = (prop) => {
        return Array.isArray(prop);
    };
    const isObject = (prop) => {
        return (typeof prop === 'object') && !isNullOrUndefined(prop) && !isArray(prop) && !isDate(prop) ;
    };
    const isDate = (prop) => {
        return prop instanceof Date;
    };
    const isNullOrUndefined = (prop) => {
        return prop === null || prop === undefined;
    };

    //endregion

    //region Config

    const mergeObjectConfigs = (config, combinedConfig) => {
        debugMode && console.log('Object merge start...');
        debugMode && console.log(JSON.stringify(config));
        debugMode && console.log(JSON.stringify(combinedConfig));

        if (!combinedConfig || !combinedConfig.children) {
            debugMode && console.log('Object merge done...');
            debugMode && console.log(JSON.stringify(config));

            return config;
        }

        let newProps = config.children;
        let oldProps = combinedConfig.children;
        let newUniqueProps = {};
        let oldUniqueProps = {};
        let commonProps = {};

        Object.keys(newProps).forEach((key) => {
            if (!oldProps[key]) {
                newUniqueProps[key] = newProps[key];
                newUniqueProps[key].isRequired = false;
            }
        });

        Object.keys(oldProps).forEach((key) => {
            if (!newProps[key]) {
                oldUniqueProps[key] = oldProps[key];
                oldUniqueProps[key].isRequired = false;
            }
        });

        Object.keys(oldProps).forEach((key) => {
            let newPropConfig = newProps[key];
            let oldPropConfig = oldProps[key];

            if (!newPropConfig || !oldPropConfig) {
                return;
            }

            oldPropConfig = oldPropConfig.type === TypeConfig.MULTI_TYPE ? oldPropConfig.children : [oldPropConfig];

            let sameTypeConfig = oldPropConfig.find((conf) => conf.type === newPropConfig.type);

            if (sameTypeConfig) {
                if (sameTypeConfig.type === TypeConfig.ARRAY) {
                    let mergedProp = mergeArrayConfigs(newPropConfig, sameTypeConfig);

                    sameTypeConfig.children = mergedProp.children;
                } else if (sameTypeConfig.type === TypeConfig.OBJECT) {
                    let mergedProp = mergeObjectConfigs(newPropConfig, sameTypeConfig);

                    sameTypeConfig.children = mergedProp.children;
                }
            } else {
                oldPropConfig.push(newPropConfig);
            }

            commonProps[key] = oldPropConfig.length > 1
                ? createTypeConfig(TypeConfig.MULTI_TYPE, oldPropConfig)
                : oldPropConfig[0];
        });

        let resultConfig = Object.assign(commonProps, oldUniqueProps, newUniqueProps);

        debugMode && console.log('Object merge done...');
        debugMode && console.log(JSON.stringify(resultConfig));

        return createTypeConfig(TypeConfig.OBJECT, resultConfig);
    };

    const mergeArrayConfigs = (config, combinedConfig) => {
        let childrenConfig = [];
        let childObjectCombinedConfig;
        let childArrayCombinedConfig;

        debugMode && console.log('Array merge start...');
        debugMode && console.log(JSON.stringify(config));
        debugMode && console.log(JSON.stringify(combinedConfig));

        let allConfigs = combinedConfig ? [...combinedConfig.children, ...config.children] : config.children;

        allConfigs.forEach((childConfig) => {
            let type = childConfig.type;

            debugMode && console.log('type: ', type);

            switch (type) {
                case TypeConfig.OBJECT:
                    childObjectCombinedConfig = mergeObjectConfigs(childConfig, childObjectCombinedConfig);
                    break;
                case TypeConfig.ARRAY:
                    childArrayCombinedConfig = mergeArrayConfigs(childConfig, childArrayCombinedConfig);
                    break;
                default:
                    if (!childrenConfig.find((conf) => conf.type === type)) {
                        childrenConfig.push(childConfig);
                    }
                    break;
            }
        });

        childObjectCombinedConfig && childrenConfig.push(childObjectCombinedConfig);
        childArrayCombinedConfig && childrenConfig.push(childArrayCombinedConfig);

        debugMode && console.log('Array merge done...');
        debugMode && console.log(JSON.stringify(childrenConfig));

        return createTypeConfig(TypeConfig.ARRAY, childrenConfig);
    };

    const createTypeConfig = (type, children, isRequired = true) => {
        return { type, children, isRequired };
    };

    const getSimplePropertyConfig = (prop) => {
        if (isDate(prop)) {
            return createTypeConfig('Date');
        } else if (isNullOrUndefined(prop)) {
            return null;
        }

        return createTypeConfig(typeof prop);
    };

    const getArrayPropertyConfig = (arr) => {
        debugMode && console.debug(`getArrayPropertyConfig start...`);
        let childrenConfig = [];

        arr.forEach((childProp, i) => {
            debugMode && console.debug(`getPropertyConfig for array item#${i}`);

            let childPropConfig = getPropertyConfig(childProp);

            debugMode && console.debug(`getPropertyConfig for array item#${i} is \n${JSON.stringify(childPropConfig)}`);

            childPropConfig && childrenConfig.push(childPropConfig);
        });

        return mergeArrayConfigs(createTypeConfig(TypeConfig.ARRAY, childrenConfig));
    };

    const getObjectPropertyConfig = (obj) => {
        let children = {};

        Object.keys(obj).forEach((key) => {
            debugMode && console.debug(`getPropertyConfig for ${key}`);

            let childPropConfig = getPropertyConfig(obj[key]);

            debugMode && console.debug(`getPropertyConfig for ${key} is \n${JSON.stringify(childPropConfig)}`);

            if (childPropConfig) {
                children[key] = childPropConfig;
            }
        });

        return createTypeConfig(TypeConfig.OBJECT, children);
    };

    const getPropertyConfig = (prop) => {
        if (isArray(prop)) {
            return getArrayPropertyConfig(prop);
        } else if (isObject(prop)) {
            return getObjectPropertyConfig(prop);
        }

        return getSimplePropertyConfig(prop);
    };

    //endregion

    //region Parser

    const configToString = (propertyConfig, tabs) => {
        switch (propertyConfig.type) {
            case TypeConfig.ARRAY:
                return arrayConfigToString(propertyConfig, tabs);
            case TypeConfig.OBJECT:
                return objectConfigToString(propertyConfig, tabs);
            case TypeConfig.MULTI_TYPE:
                return multipleConfigsToString(propertyConfig, tabs);
            default:
                return `${propertyConfig.type}`;
        }
    };

    const arrayConfigToString = (propertyConfig, tabs) => {
        if (!propertyConfig.children.length) {
            return `any[]`;
        }

        let arrayBody = propertyConfig.children.map((children) => configToString(children, tabs)).join(' | ');
        let result;

        if (propertyConfig.children.length === 1 && propertyConfig.children[0].type !== TypeConfig.OBJECT) {
            result = `${arrayBody}[]`
        } else {
            result = `(${arrayBody})[]`;
        }

        return result;
    };

    const objectConfigToString = (propertyConfig, tabs) => {
        let indent = Array(tabs).fill(TAB).join('');
        let endObjIndent = Array(tabs - 1).fill(TAB).join('');

        let lines = Object.keys(propertyConfig.children).map((key) => {
            let childConfig = propertyConfig.children[key];

            return `${indent}${key}${childConfig.isRequired ? '' : '?'}: ${configToString(childConfig, tabs + 1)};`;
        });
        let objBody = lines.join('\n');

        return lines.length ? `{\n${objBody}\n${endObjIndent}}` : `{}`;
    };

    const multipleConfigsToString = (propertyConfig, tabs) => {
        return propertyConfig.children.map((children) => configToString(children, tabs)).join(' | ');
    };

    //endregion

    window.generateInterface = (obj) => {
        let tabs = 1;
        let resultTmpl = 'declare interface IObject [content];';
        let propertyConfig = getPropertyConfig(obj);
        let interfaceStr = configToString(propertyConfig, tabs);

        if (propertyConfig.type !== TypeConfig.OBJECT) {
            interfaceStr = `as ${interfaceStr}`;
        }

        return resultTmpl.replace('[content]', interfaceStr);
    };
})();