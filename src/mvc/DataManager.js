/**
 * @file DataManager
 * @author hongfeng(homfen@outlook.com)
 */
define(
    function (require) {
        var u = require('underscore');
        var StoreManager = require('./StoreManager');
        var RequestManager = require('./RequestManager');
        var Deferred = require('er/Deferred');
        var exports = {};

        function getQuery(obj) {
            var query = [];
            if (obj) {
                u.each(obj, function (value, key) {
                    query.push(key + '=' + value);
                });
            }
            return query.join('&');
        }

        function getCache(key) {
            var eventObject = StoreManager.get(key);
            if (eventObject) {
                var ajax = this.getAjax() || require('er/ajax');
                ajax.fire.call(this, 'done', eventObject);
                var deferred = new Deferred();
                deferred.resolve(eventObject);
                return deferred.promise;
            }
            return null;
        }

        /**
         * 发起一个AJAX请求
         *
         * @param {string} [name] 请求名称
         * @param {Object} [data] 请求数据
         * @param {Object} [options] 请求配置项
         * @param {boolean} [options.cache] 是否启用缓存
         * @param {number} [options.expire] 过期时间
         * @param {Array} [options.dependencies] 依赖项(链接)
         * @return {er.meta.FakeXHR}
         */
        exports.request = function (name, data, options) {
            var context = this.getRequest(name, data, options);
            var key = context.options.url;
            var query = getQuery(data);
            if (query) {
                key += (key.indexOf('?') > -1 ? '&' : '?') + query;
            }
            var cache = options.cache;
            if (cache) {
                var cachedObj = getCache.call(this, key);
                if (cachedObj) {
                    return cachedObj;
                }
            }
            var fakeXHR = this.$super(arguments);
            if (cache) {
                fakeXHR.done(function (eventObject) {
                    StoreManager.set(key, eventObject, null, options.expire);
                    var dependencies = options.dependencies || [];
                    dependencies.forEach(function (dependency) {
                        StoreManager.remove(dependency);
                    });
                });
            }
            return fakeXHR;
        };

        var oo = require('eoo');
        var DataManager = oo.create(RequestManager, exports);

        /**
         * 注册一个请求配置
         *
         * @param {Function} Type 提供配置的类型对象
         * @param {string} name 配置名称
         * @param {meta.RequestConfig} config 配置项
         */
        DataManager.register = function (Type, name, config) {
            RequestManager.register(arguments);
        };

        return DataManager;
    }
);
