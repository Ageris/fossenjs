(function () { 'use strict';
    var pub = {
        /**
        Overrides a function with another returning a wrapper for the overridden function that should be placed over the original.
        This allows you to spy and modify all arguments given to the overridden function before calling it.
        E.g.:
        //Override document.querySelector
        document.querySelector = override(document.querySelector, function(state){
            state.argsAsArray[0] = 42;
            state.callOverriden();
        });

        To restore the original function get the function reference from the overrider function like so:
        //Restore document.querySelector after overriding it
        document.querySelector = document.querySelector.__original;

        The overrider is given a state object representing the state of the original function that allows for modifications.
        state = {
            original : {function} - The original function that was overridden  
            thisArg : {*} - The "this" argument supplied to the original function
            argsAsArray : {*[]} - The arguments given to the original function
            callOverridden : {function} - A function that will call the original function with "this" as state.thisArg and arguments as state.argsAsArray
            callOriginal : {function} - A function that will call the original function with unmodified "this" and arguments (irrespective of changes to state)
        }
        Note that you can override "this" and arguments to the overridden function by modifying the state object and calling state.callOverridden

        @param {function} funcToOverride - The function that should be overridden.
        @param {function} overrider - The function that will be called instead of the overridden function.
        @returns {function} - A function that should be placed over the one that is overridden.
        */
        override: function (funcToOverride, overrider) {
            var spy = function () {
                var originalThis = this,
                    originalArgsAsArray = Array.prototype.slice.call(arguments),
                    state = {
                        original: funcToOverride,
                        thisArg: this,
                        argsAsArray: Array.prototype.slice.call(arguments),
                        callOverridden: void 0,
                        callOriginal: void 0
                    };

                state.callOverridden = function () {
                    return funcToOverride.apply(state.thisArg, state.argsAsArray);
                };
                state.callOriginal = function () {
                    return funcToOverride.apply(originalThis, originalArgsAsArray);
                };

                return overrider(state);
            };

            if (typeof funcToOverride !== 'function') {
                throw new Error("funcToOverride must be a function");
            }
            if (typeof overrider !== 'function') {
                throw new Error("Overrider argument must be a function");
            }

            spy.__original = funcToOverride;

            return spy;
        },
        /**
        Converts an array-like object to an actual array or copies one array into a new one.
        @param {array-like} arrayLike - An object that is similar to an array (arguments/nodelist...).
        @returns {array} - An actual array containing the same elements in the same order as the array-like.
        */
        toArray: function (arrayLike) {
            return Array.prototype.slice.call(arrayLike);
        },
        /**
        Converts an unsafe string into a readable url-safe string (removing or translating illegal characters).
        @param {string} unsafeString - The unsafe string to clean.
        @returns {string} - The safe string.
        */
        makeReadableUrlSafe: (function () {
            var replacements = [
                [/\s/g, '-'],
                [/\./g, '_'],
                [/æ/g, 'ae'],
                [/Æ/g, 'AE'],
                [/ø/g, 'o'],
                [/Ø/g, 'O'],
                [/å/g, 'a'],
                [/Å/g, 'A'],
                [/[^a-z0-9\-_]/ig, '']
            ];
            return function (unsafeString) {
                return pub.replaceArray(unsafeString.trim(), replacements);
            };
        })(),
        /**
        Takes an array of regular expressions a string and replaces the text in the array with values provided by the array.
        @param {string} str - The string to replace tokens in.
        @param {[regex, regex][]} replacements - An array arrays where the first element in the sub array is what to find and the secont is what to replace it with.
        @returns {string} - The string with all tokens replaced.
        */
        replaceArray: function (str, replacements) {
            var i, ln = replacements.length;
            for (i = 0; i < ln; i++) {
                str = str.replace(replacements[i][0], replacements[i][1]);
            }

            return str;
        },
        /**
        Implementation of Array.find for older browsers.
        See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
        */
        find: function(arr, callback, thisArg){
            var item;
            arr.some(function (el, idx, arr) {
                if (callback.call(thisArg, el, idx, arr)) {
                    item = el;
                    return true;
                }
                return false;
            });
            return item;
        },
        /**
        Returns the query string as an object where each key is a query string paramter with an accompanied value.
        @returns {object} - The query string represented as an object (or hash map).
        */
        queryStringAsObject: function () {
            var qString = location.search,
                qObj = {}, splitQString, i, qSplitLength,
                key, val, innerSplit;
            if (!qString || qString.length <= 1) return qObj;

            splitQString = qString.substr(1).split('&');
            qSplitLength = splitQString.length;
            for (i = 0; i < qSplitLength; i++) {
                innerSplit = splitQString[i].split('=');
                key = innerSplit[0];
                val = innerSplit[1];
                qObj[decodeURIComponent(key)] = decodeURIComponent(val);
            }

            return qObj;
        },
        /**
        Returns a single parameter value from the query string.
        @param {string} queryParam - The query parameter to find.
        @returns {string} - The value of the query parameter or undefined if not exists.
        */
        queryString: function (queryParam) {
            return pub.queryStringAsObject()[queryParam];
        },
        /**
        Checks if the given url is absolute.
        @param {url} url The url to check
        @param {bool} [noProtocolImpliesAbsolute=false] If true urls that are protocol relative will be interpreted as absolute (e.g.: //ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.js)
        @returns {bool} True if the url is absolute, false if not
        */
        urlIsAbsolute: function (url, noProtocolImpliesAbsolute) {
            var normalizedUrl = url.toLowerCase();
            if (noProtocolImpliesAbsolute && normalizedUrl.indexOf('//') === 0) {
                return true;
            }

            return (normalizedUrl.indexOf('http://') === 0 ||
                normalizedUrl.indexOf('https://') === 0 ||
                normalizedUrl.indexOf('file://') === 0);
        },
        /**
        Checks if the given url is local (shares the same host and protocol) to the domain or not.
        @param {url} url The url to check
        */
        urlIsLocal: function (url) {
            if (!pub.urlIsAbsolute(url)) return true;

            var normalizedUrl = url.toLowerCase(),
                locationDomain = (location.protocol + '//' + location.host + '/').toLowerCase();

            return (normalizedUrl.indexOf(locationDomain) === 0);
        },
        /**
        Concatenates one or more url fragments by ensuring they are separated by a single / character. Supports both first argument as array or multiple arguments to concatenate.
        @param {...string|string[]} fragments - Two or more fragments to concatenate.
        @returns {string} - The concatenated url.
        */
        concatUrls: function (fragments) {
            var cString = "";
            fragments = Array.isArray(fragments) ? fragments : Array.prototype.slice.call(arguments);

            cString = fragments[0].trim()[fragments[0].length - 1] === '/' ? fragments[0].trim() : fragments[0].trim() + '/';
            fragments.slice(1).forEach(function (fragment) {
                if (!fragment) return;
                fragment = fragment+''.trim();
                if (fragment[0] === '/') fragment = fragment.substr(1);
                cString += fragment[fragment.length - 1] === '/' ? fragment : fragment + '/';
            });

            return cString.substr(0, cString.length - 1);
        },
        /**
        Creates a shallow clone of the object with the same keys and values as the original.
        @param {object} obj The object to clone.
        @param {object} [...additionalProperties] Additional arguments are merged into the cloned object where the rightmost object will override preceding values.
        @returns {object} A new object with the same keys and values.
        */
        clone: function (obj) {
            if (!obj || typeof obj !== 'object') return obj;
            var copy = obj.constructor(),
                keyCloner = function(target, source, key) {
                    if (source.hasOwnProperty(key)) {
                        target[key] = source[key];
                    }
                },
                mergeObjects = pub.toArray(arguments).slice(1);

            Object.keys(obj).forEach(keyCloner.bind(undefined, copy, obj));
            
            if (mergeObjects.length > 0) {
                mergeObjects.forEach(function(mergeObject) {
                    Object.keys(mergeObject).forEach(keyCloner.bind(undefined, copy, mergeObject));
                });
            }

            return copy;
        },
        /**
        Converts an object to a url safe query string.
        @param {object} obj The object to convert
        @param {string} [prefix=?] The prefix for the query
        @returns {string} The url safe query string prefixed with the prefix
        */
        objectToQueryString: function(obj, prefix) {
            var converter = function(key) {
                    return key + "=" + encodeURIComponent(obj[key]);
                };

            prefix = prefix || "?";

            return prefix+Object.keys(obj).map(converter).join('&');
        },
        /**
        Creates a memoized version of the given function. The memoization will use the first argument as the key for lookup in previously stored results.
        The original function is not modified.
        @param {function} func The function that will be memoized.
        @return {function} A memoized version of the function.
        */
        memoize: function (func) {
            var cache = {}, undefinedResult, nullResult;
            return function(keyArg) {
                var keyArgString;

                if (keyArg === undefined) {
                    if (undefinedResult !== undefined) return undefinedResult;
                    return undefinedResult = func.apply(this, pub.toArray(arguments));
                }
                if (keyArg === null) {
                    if (nullResult !== undefined) return nullResult;
                    return nullResult = func.apply(this, pub.toArray(arguments));
                }

                keyArgString =  keyArg.toString();
                if (cache[keyArgString]) return cache[keyArgString];
                return cache[keyArgString] = func.apply(this, pub.toArray(arguments));
            };
        },
        /**
        Tries to execute a function repeatedly until it succeeds or until it has failed a set number of times.
        @param {function} functionToRetry The function that should be repeatedly executed
        @param {bool} [afterLoad] Will try once and then only start retrying after the page load event has fired. Default false.
        @param {int} [attempts] How many times should the function try to be executed (default 5)
        @param {int} [delay] How long (in ms) should the function wait between executions (default 100ms)
        */
        retry: (function () {
            var defaultAttempts = 5,
                defaultDelay = 100,
                retry = function (data) {
                    var result;
                    console.log("retrying", data);
                    data.attemptsLeft--;
                    try {
                        result = data.func();
                        console.log("retry success", data);
                        data.deferred.resolve(result);
                    } catch (e) {
                        console.log("retry failed", data);
                        if (data.afterLoad && document.readyState !== 'complete') {
                            console.log("retrying on load", data);
                            $(window).one('load', retry.bind(void 0, data));
                            return;
                        }
                        if (data.attemptsLeft > 0) {
                            clearTimeout(data.timeout);
                            data.timeout = setTimeout(retry.bind(void 0, data), data.delay);
                            return;
                        }
                    }

                    data.deferred.reject();
                };

            return function (functionToRetry, afterLoad, attempts, delay) {
                var data = {
                    attemptsLeft: attempts || defaultAttempts,
                    delay: delay || defaultDelay,
                    deferred: $.Deferred(),
                    func: functionToRetry,
                    afterLoad: document.readyState === 'complete' ? false : !!afterLoad,
                    timeout: null
                };

                retry.call(void 0, data);

                return data.deferred.promise();
            };
        })(),
        /**
        Returns a new array that contian only unique items from the given array.
        @param {mixed[]} arr The array to extract distinct elements from.
        @returns {mixed[]} Array containing only unique items.
        */
        unique: function (arr) {
            var cache = {}, uniqueArray = [];
            arr.forEach(function(val) {
                if (cache.hasOwnProperty(val)) {
                    return;
                }
                cache[val] = true;
                uniqueArray.push(val);
            });

            return uniqueArray;
        },
        /**
        Returns the cursor position relative to an element.

        @param {MouseEvent} evt The mouse event to retrieve position from.
        @param {Element} [el=evt.currentTarget] The element to measure from or use currentTarget from event if not defined.
        */
        cursorRelativeTo: function (evt, el) {
            var offset;

            el = el || evt.currentTarget;
            offset = pub.offset(el);

            return {
                left: evt.pageX - offset.windowLeft,
                top: evt.pageY - offset.windowTop
            };
        },
        /**
        Extracts the leaf portion of a type string and returns it. Useful for getting only the name of the specific class from a Json.net $type string.
        e.g.:
        Solution.Project.Entities.MyClass, Solution.Project
        returns "MyClass"
        */
        getTypeName: function(typeString) {
            var commaPoint = typeString.indexOf(','),
                namespace = typeString.substr(0, commaPoint),
                lastPeriod = namespace.lastIndexOf('.');

            return namespace.substr(lastPeriod+1);
        },
        /**
        Json.Net supports passing types for serialized elements, but for untyped arrays this is problematic because they are not actually serialized as arrays.
        This function normalizes this behaviour by ensuring that a typed array is actually an array. The type properties are instead placed as keys on the
        new array instance.

        This process turns this:
        untypedArray: {
            $type: 'type'
            $values: [...]
        }
        into:
        untypedArray: [...]
        untypedArray.$type = 'type'

        regular arrays remain untouched.

        @param {object|array} typedArrayObject The array object to normalize.
        @returns {array} The normalized array
        */
        normalizeJsonDotNetTypedArrays: function(typedArrayObject) {
            if (Array.isArray(typedArrayObject)) {
                return typedArrayObject;
            }

            if (!typedArrayObject.$values || !Array.isArray(typedArrayObject.$values)) throw new Error('The given object is not supported. The $values key must be an array.');

            typedArrayObject.$values.$type = typedArrayObject.$type;
            return typedArrayObject.$values;
        },
        /**
        Copies keys with values optionally matching the filter from source to target and optionally maps the values through the mutator function.
        @param {mixed} target The target object that will receive all keys and values from source.
        @param {object} source The source object from which keys and values will be copied.
        @param {function(key, value)} [mutator] Optional mutator function that takes the key and value from source and returns the new value that will be placed on the target.
        @param {function(key, value)} [filter] Optional filter function that takes the key and value and returns true if the value should be placed on the target.
        @returns {mixed} The target object after modification.
        */
        assign: function (target, source, mutator, filter) {
            Object.keys(source).forEach(function(key) {
                var value = source[key];
                if (typeof filter === 'function') {
                    if (!filter(key, value)) return;
                }
                if (typeof mutator === 'function') {
                    value = mutator(key, value);
                }
                target[key] = value;
            });

            return target;
        },
        /**
        Convers an array into an object by using the items as keys and the index as values.
        @param {Array} arr The array to convert
        @param {function} [keyMutator] An optional key mutator function given (item, index, arr) whose result will be the key for an item.
        @param {function} [valueMutator] An optional value mutator function given (item, index, arr) whose result will be the value for an item.
        @returns {object} An object where the keys are array values and values are item indexes.
        */
        assignArray: function(arr, keyMutator, valueMutator){
            var obj = {};
            arr.forEach(function (item, index) {
                var key = !!keyMutator ? keyMutator(item, index, arr) : item;
                var value = !!valueMutator ? valueMutator(item, index, arr) : index;
                obj[key] = index;
            });
            return obj;
        },
        /**
        Takes an object and stores it in the given namespace. Will overwrite any existing object.
        @param {string} namespace Full namespace to store the object in.
        @param {object} object The object to store.
        @param {bool} [createIfNotExist=false] Create the namespace if it does not exist.
        @param {object} [rootObject=window] The root object on which to look for the namespace.
        @returns {object} The stored object.
        */
        storeInNamespace: function (namespace, object, createIfNotExist, rootObject) {
            var namespaceParts = namespace.split('.'),
                currentName, currentObj;

            rootObject = rootObject || window;

            while (namespaceParts.length > 1) {
                currentName = namespaceParts.shift();
                currentObj = rootObject[currentName];
                if (!currentObj && createIfNotExist) {
                    currentObj = rootObject[currentName] = {};
                }
                if (!currentObj) throw new Error('Namespace part ' + currentName + ' not found on object. Complete namespace was: ' + namespace);
                rootObject = currentObj;
            }

            rootObject[namespaceParts[0]] = object;

            return object;
        },
        /**
        Checks if the given period-separated namespace exists (is defined).
        E.g.: Alpha.Bravo.Charlie
        @param {string} namespace The namespace string to check
        @return {bool} True if the namespace is set (is not undefined) false if any part of it is undefined
        */
        namespaceExists: function(namespace){
            var names = namespace.split('.'),
                idx = -1,
                node = window;

            while (node = node[names[++idx]]) {
                if (idx === names.length - 1) return true;
            }

            return false;
        },

        /**
        Creates a new error object of type Error with the optional data.
        @param {string} message The error message.
        @param {object} [data] Any optional data. Appended to the error object as the property "data"
        @param {bool} [logData=true] Whether or not to log the data object and message to the console immediately. This is usefull for debugging as the data is swallowed if the error is not handled.
        @return {Error} A new error object 
        */
        newError: function(message, data, logData){
            var err = new Error(message);

            if (data) {
                err.data = data;
            }

            logData = logData === false ? false : true;
            if (logData) {
                if (console.error) {
                    console.error(message, data);
                } else {
                    console.log(message, data);
                }
            }
            
            //Remove this function from the stack to avoid confusion.
            if (err.stack) {
                var cleanStack = err.stack,
                    firstNewLine = cleanStack.indexOf('\n'),
                    secondNewLine = cleanStack.substr(firstNewLine + 1).indexOf('\n');
                cleanStack = cleanStack.substr(0, firstNewLine) + cleanStack.substr(secondNewLine + 1 + firstNewLine);
                err.stack = cleanStack;
            }
            return err;
        },

        /**
        Given a node will determine if it matches the given selector.
        This is a shim for the function node.matches that works cross-browser.
        @param {Element} node The node to check.
        @param {string} selector The selector to match against.
        @return {bool}
        */
        nodeMatchesSelector: function (node, selector) {
            if (!node) throw new Error("Node argument must be defined");
            var matcher = node.matches ||
                node.msMatchesSelector ||
                node.webkitMatchesSelector ||
                node.mozMatchesSelector;

            if (!matcher) {
                throw new Error("No node matcher found");
            }

            return matcher.call(node, selector);
        },
        /**
        Finds the closest ancestor node that matches the selector
        @param {Element} node The node to start looking for ancestors (is not matched itself).
        @param {string|Element} selector The selector to match against.
        @return {Element} The first ancestor matching the selector or undefined if there is no match.
        */
        findParentNode: function(node, selector) {
            var parent = node.parentElement;

            while (parent) {
                if ((selector instanceof Node) ? (parent === selector) : pub.nodeMatchesSelector(parent, selector)) {
                    return parent;
                }
                parent = parent.parentElement;
            }

            return undefined;
        },
        /**
        Returns the real offset and page positions of the given elements top left corner.
        Returns an object with:
            left: Page relative left position
            top: Page relative top position
            windowLeft: Window (frame) relative left postion
            windowTop: Window (frame) relative top position
            width: The width of the element
            height: The height of the element

        @param {Element} el The element to find the offset for.
        @returns {object} Data about the position relative to page and window.
        */
        offset: function (el) {
            var left = el.offsetLeft,
                top = el.offsetTop,
                scrollLeft = el.offsetLeft,
                scrollTop = el.offsetTop,
                offsetParent = el;

            while (offsetParent = offsetParent.offsetParent) {
                left += offsetParent.offsetLeft;
                top += offsetParent.offsetTop;
                scrollLeft -= (offsetParent.scrollLeft);
                scrollTop -= (offsetParent.scrollTop - offsetParent.offsetTop);
            }

            return {
                left: left,
                top: top,
                offsetLeft: el.offsetLeft,
                offsetTop: el.offsetTop,
                windowLeft: scrollLeft,
                windowTop: scrollTop,
                width: el.offsetWidth,
                height: el.offsetHeight
            };
        },
        findClosestScrollableOffsetParent: function(el){
            var offsetParent = el;

            while (offsetParent = offsetParent.offsetParent) {
                if (offsetParent.scrollHeight > offsetParent.offsetHeight) return offsetParent;
            }

            return undefined;
        },
        /**
        Returns true if the given element is out of view. By default it will check if the element is fully out of view.
        @param {DOMElement} el The element to check.
        @param {bool} [partially=false] If true will return true if the element is partially outside of the view.
        @returns {bool} True if out of view, false if not.
        */
        isOutOfView: function (el, partially) {
            var elOffset = pub.offset(el),
                clientWidth = document.documentElement.clientWidth,
                clientHeight = document.documentElement.clientHeight;

            //First deal with the element being completely below or completely to the left of the viewport
            if (elOffset.windowTop > clientHeight) return true;
            if (elOffset.windowLeft > clientWidth) return true;

            //Now deal with the element being completely to the right or completely above the viewport
            if ((elOffset.windowTop + elOffset.height) < 0) return true;
            if ((elOffset.windowLeft + elOffset.width) < 0) return true;

            if (partially) { //Check if the element is partially out of view
                if ((elOffset.windowTop + elOffset.height) > clientHeight || (elOffset.windowTop < 0)) return true; //partially below or above
                if ((elOffset.windowLeft + elOffset.width) > clientWidth || (elOffset.windowLeft < 0)) return true; //partially to the left or right
            }

            return false;
        },
        /**
        Scrolls the y axis of the scroll element so that the element is completely within the viewport y axis.
        @param {DOMElement} el The element that should be completly inside the viewport y axis.
        @param {int} [padding=0] Any optional padding to apply when scrolling
        @param {DOMElement} [scrollElement] The element to scroll. If not specified will find the first offsetParent where scrollHeight and offsetHeight differ (indicating a scrollbar).
        */
        scrollY: function (el, padding, scrollElement) {
            var elOffset, scrollTo, isPartiallyBelow;

            if (!pub.isOutOfView(el, true)) { //The element is in full view, no need to scroll
                return;
            }

            elOffset = pub.offset(el);
            isPartiallyBelow = (elOffset.windowTop + elOffset.height) > document.documentElement.clientHeight; //True if partially below, false if partially above
            padding = padding || 0;
            scrollElement = pub.findClosestScrollableOffsetParent(el) || document.body;

            if (isPartiallyBelow) { //The element is above the window
                scrollTo = ((elOffset.offsetTop - document.documentElement.clientHeight) + elOffset.height) + padding;
            } else { //The element is below or inside the window
                scrollTo = el.offsetTop - padding;
            }

            scrollElement.scrollTop = scrollTo;
        },

        /**
        Ref: https://github.com/yanatan16/nanoajax (0.4)
        This is a tiny ajax function that performs ajax requests of most types including CORS.

        Supported options:        
        url: string, required
        headers: object of {header_name: header_value, ...}
        body: string (sets content type to 'application/x-www-form-urlencoded' if not set in headers)
        method: 'GET', 'POST', etc. Defaults to 'GET' or 'POST' based on body
        cors: If your using cross-origin, you will need this true for IE8-9 (to use the XDomainRequest object, also see Compatibility)    
        responseType: string, various compatability, see xhr docs for enum options
        withCredentials: boolean, IE10+, CORS only
        timeout: long, ms timeout, IE8+
        onprogress: callback, IE10+

        The callback function is given three arguments:
        statusCode: integer status or null
        response:
            if responseType set and supported by browser, this is an object of some type (see docs)
            otherwise if request completed, this is the string text of the response
            if request is aborted, this is "Abort"
            if request times out, this is "Timeout"
            if request errors before completing (probably a CORS issue), this is "Error"
        request: the request object

        Examples:
        For GET requests where only the url parameter is required simply specify the url.
        utils.ajax('http://api.com/', function(response){
            if (statusCode === 200) {
                alert('ok');
            } else {
                alert('error');
            } 
        });

        utils.ajax({url: 'myUrl'}, function(response){
            if (statusCode === 200) {
                alert('ok');
            } else {
                alert('error');
            } 
        });

        @param {object|string} options The options for the request or the url. See details above.
        @param {function} callback The callback function that is executed once the request completes or fails.
        */
        ajax: (function(){
            var global = window,
                reqfields = ['responseType', 'withCredentials', 'timeout', 'onprogress'];
            var getRequest = function (cors) {
                // XDomainRequest is only way to do CORS in IE 8 and 9
                // But XDomainRequest isn't standards-compatible
                // Notably, it doesn't allow cookies to be sent or set by servers
                // IE 10+ is standards-compatible in its XMLHttpRequest
                // but IE 10 can still have an XDomainRequest object, so we don't want to use it
                if (cors && global.XDomainRequest && !/MSIE 1/.test(navigator.userAgent))
                    return new XDomainRequest;
                if (global.XMLHttpRequest)
                    return new XMLHttpRequest;
            };
            var setDefault = function (obj, key, value) {
                obj[key] = obj[key] || value;
            };

            // Simple and small ajax function
            // Takes a parameters object and a callback function
            // Parameters:
            //  - url: string, required
            //  - headers: object of `{header_name: header_value, ...}`
            //  - body:
            //      + string (sets content type to 'application/x-www-form-urlencoded' if not set in headers)
            //      + FormData (doesn't set content type so that browser will set as appropriate)
            //  - method: 'GET', 'POST', etc. Defaults to 'GET' or 'POST' based on body
            //  - cors: If your using cross-origin, you will need this true for IE8-9
            //
            // The following parameters are passed onto the xhr object.
            // IMPORTANT NOTE: The caller is responsible for compatibility checking.
            //  - responseType: string, various compatability, see xhr docs for enum options
            //  - withCredentials: boolean, IE10+, CORS only
            //  - timeout: long, ms timeout, IE8+
            //  - onprogress: callback, IE10+
            //
            // Callback function prototype:
            //  - statusCode from request
            //  - response
            //    + if responseType set and supported by browser, this is an object of some type (see docs)
            //    + otherwise if request completed, this is the string text of the response
            //    + if request is aborted, this is "Abort"
            //    + if request times out, this is "Timeout"
            //    + if request errors before completing (probably a CORS issue), this is "Error"
            //  - request object
            //
            // Returns the request object. So you can call .abort() or other methods
            //
            // DEPRECATIONS:
            //  - Passing a string instead of the params object has been removed!
            //
            return function (params, callback) {
                if (typeof params === 'string') {
                    params = { url: params };
                }

                // Any variable used more than once is var'd here because
                // minification will munge the variables whereas it can't munge
                // the object access.
                var headers = params.headers || {}
                  , body = params.body
                  , method = params.method || (body ? 'POST' : 'GET')
                  , called = false;

                var req = getRequest(params.cors);

                function cb(statusCode, responseText) {
                    return function () {
                        if (!called)
                            callback(req.status === undefined ? statusCode : req.status,
                                     req.response || req.responseText || responseText,
                                     req);
                        called = true;
                    }
                }

                req.open(method, params.url, true);

                var success = req.onload = cb(200);
                req.onreadystatechange = function () {
                    if (req.readyState === 4) success();
                }
                req.onerror = cb(null, 'Error');
                req.ontimeout = cb(null, 'Timeout');
                req.onabort = cb(null, 'Abort');

                if (body) {
                    setDefault(headers, 'X-Requested-With', 'XMLHttpRequest');

                    if (!global.FormData || !(body instanceof global.FormData)) {
                        setDefault(headers, 'Content-Type', 'application/x-www-form-urlencoded');
                    }
                }

                for (var i = 0, len = reqfields.length, field; i < len; i++) {
                    field = reqfields[i];
                    if (params[field] !== undefined)
                        req[field] = params[field];
                }

                for (var field in headers)
                    req.setRequestHeader(field, headers[field]);

                req.send(body);

                return req;
            };
        })(),

        /**
        Returns a new function that will call the inner function at most once every "throttleAmount" milliseconds
        @param {function} func The function to throttle
        @param {int} throttleAmount The number of milliseconds to throttle the function
        @return {function} A new function calling the inner func at most every "throttleAmount" milliseconds
        */
        throttle: function (func, throttleAmount) {
            var timeout;
            return function () {
                if (!timeout) {
                    var self = this,
                        args = pub.toArray(arguments);
                    
                    timeout = setTimeout(function () {
                        timeout = undefined;
                        func.apply(self, args);
                    }, throttleAmount);
                }
            };
        },
        /**
        Returns a new function that will call the inner function once after the given duration.
        For each subsequent call to the function the timer is reset. The effecive result is that the function is called at most once during a given timespan even though
        it may try to be called more often.
        @param {function} func The function to debounce
        @param {int} duration The amount of time in milliseconds that must pass without a call to the function before it is called.
        @return {function} The debounce function wrapper.
        */
        debounce: function (func, duration) {
            var timeout;
            return function () {
                var onTimeout = function () {
                    timeout = undefined;
                    func.apply(this, pub.toArray(arguments));
                };
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(onTimeout, duration);
            };
        },

        /**
        @returns {Date} Returns a new date object with the current time in utc.
        */
        getUTCNow: function () {
            var now = new Date(),
                utcNow = now.getTime() + (now.getTimezoneOffset()*60*1000);

            return new Date(utcNow);
        },

        /**
        Dispatch a custom event on the source element with the provided data.
        Events are dispatched on the given element and bubble up the DOM tree like any other event.
        To listen for events use addEventListener as you would with any other type of event.

        Note: This is not the standards compliant way to dispatch events (example on MDN), but because IE we have to do it this way.

        @params {string} name The name of the event as a lowercase string.
        @params {object} [data] An optional data object for the event. Attached to the event object on property 'data'.
        @params {Element} [sourceElement=document] The source element on which do dispatch the event.
        @params {bool} [bubbles=true] Whether or not the event will bubble.
        @params {bool} [cancelable=true] Whether or not the event can be cancelled.
        */
        dispatchCustomEvent: function (name, data, sourceElement, bubbles, cancelable) {
            var evt = document.createEvent('Event');

            bubbles = bubbles === false ? false: true;
            cancelable = cancelable === false ? false : true;
            sourceElement = sourceElement || document;

            evt.initEvent(name.toLowerCase(), bubbles, cancelable);

            if (data) {
                evt.data = data;
            }
            
            sourceElement.dispatchEvent(evt);
        }
    };

    window.fossen = pub;
})();