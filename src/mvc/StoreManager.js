/**
 * @file StoreManager
 * @author hongfeng(homfen@outlook.com)
 */
define(
    function (require) {
        var store = require('store');
        var u = require('underscore');

        /**
         * getRealKey获取真实的key
         *
         * @param {string} key 键
         * @param {string} prefix 前缀
         * @return {string} realKey
         */
        function getRealKey(key, prefix) {
            var host = location.hostname;
            host += prefix ? '/' + prefix : '';
            key = host + '@' + key;
            return key;
        }

        /**
         * 通用store.set
         *
         * @param {string} key 键
         * @param {string} value 值
         * @param {string} prefix 前缀
         * @param {number} expire 过期时间，秒为单位
         */
        function set(key, value, prefix, expire) {
            if (store.enabled) {
                try {
                    var realKey = getRealKey(key, prefix);
                    var data = prepareData(value, expire);
                    var realValue = serialize(data);
                    store.set(realKey, realValue);
                }
                catch (ex) {
                    if (checkFull(ex)) {
                        removeSeldomUsed();
                        set(arguments);
                    }
                }
            }
        }

        /**
         * update
         *
         * @param {string} key 键
         * @param {string} prefix 前缀
         * @param {Object} data 数据对象
         */
        function update(key, prefix, data) {
            try {
                var realKey = getRealKey(key, prefix);
                var realValue = serialize(data);
                store.set(realKey, realValue);
            }
            catch (ex) {
                if (checkFull(ex)) {
                    removeSeldomUsed();
                    update(arguments);
                }
            }
        }

        /**
         * 通用store.get
         *
         * @param {string} key 键
         * @param {string} prefix 前缀
         * @return {string} value
         */
        function get(key, prefix) {
            if (store.enabled) {
                var realKey = getRealKey(key, prefix);
                var realValue = store.get(realKey);
                if (realValue) {
                    var data = deserialize(realValue);
                    var value = handleData(key, prefix, data);
                    return value;
                }
            }
            return null;
        }

        /**
         * 通用store.remove
         *
         * @param {string} key 键
         * @param {string} prefix 前缀
         */
        function remove(key, prefix) {
            key = getRealKey(key, prefix);
            store.enabled && store.remove(key);
        }

        /**
         * 通用store.clear
         */
        function clear() {
            store.enabled && store.clear();
        }

        /**
         * 通用store.getAll
         *
         * @return {Object} all
         */
        function getAll() {
            if (store.enabled) {
                var realAll = store.getAll();
                var all = [];
                u.each(realAll, function (value, realKey) {
                    var arr1 = realKey.split('@');
                    var key = arr1[1];
                    var arr2 = arr1[0].split('/');
                    var host = arr2[0];
                    var prefix = arr2.length > 1 ? arr2[1] : '';
                    var data = deserialize(value);
                    all.push({
                        host: host,
                        key: key,
                        prefix: prefix,
                        value: data.value,
                        timestamp: data.timestamp,
                        expire: data.expire,
                        usedTimes: data.usedTimes
                    });
                });
                return all;
            }
            return null;
        }

        function getAllThisHost() {
            var host = location.hostname;
            var all = getAll();
            if (all && all.length) {
                all = u.filter(all, function (item) {
                    return item.host === host;
                });
            }
            return all;
        }

        function removeExpired(list) {
            var now = (new Date()).getTime();
            var count = 0;
            u.each(list, function (item) {
                var expire = item.expire * 1000 + item.timestamp;
                if (now >= expire) {
                    remove(item.key, item.prefix);
                    count++;
                }
            });
            return count;
        }

        function removeSeldomUsed() {
            var all = getAllThisHost();
            if (all && all.length) {
                if (!removeExpired(all)) {
                    all.sort(function (a, b) {
                        return a.usedTimes - b.usedTimes;
                    });
                    var first = all[0];
                    remove(first.key, first.prefix);
                }
            }
        }

        function serialize(obj) {
            return JSON.stringify(obj);
        }

        function deserialize(str) {
            return JSON.parse(str);
        }

        function prepareData(value, expire, usedTimes) {
            return {
                timestamp: (new Date()).getTime(),
                expire: expire || 0,
                usedTimes: usedTimes || 0,
                value: value
            };
        }

        function handleData(key, prefix, data) {
            if (data.expire) {
                var now = (new Date()).getTime();
                var expire = data.expire * 1000 + data.timestamp;
                if (now < expire) {
                    data.usedTimes += 1;
                    update(key, prefix, data);
                }
                else {
                    remove(key, prefix);
                    return null;
                }
            }
            return data.value;
        }

        /**
         * 检查localStorage是否已满
         *
         * @param {Object} ex Exception对象
         * @return {boolean} 是否已满
         */
        function checkFull(ex) {
            var quotaRegexp = /quota/i;
            if (quotaRegexp.test(ex.name)
                || quotaRegexp.test(ex.message)
                || ex.name === 'Error') {
                return true;
            }
            return false;
        }


        var oo = require('eoo');
        var exports = {};
        var StoreManager = oo.create(exports);

        StoreManager.set = set;
        StoreManager.get = get;
        StoreManager.remove = remove;
        StoreManager.clear = clear;
        StoreManager.getAll = getAll;

        return StoreManager;
    }
);
