"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var Deduplicator = /** @class */ (function () {
    function Deduplicator(opt) {
        var _this = this;
        if (opt === void 0) { opt = {}; }
        this.entries = {};
        this.timeout = null;
        this.now = +new Date();
        this.options = { max: 999, age: 1000 * 9 };
        this.check = function (id) {
            if (!_this.entries[id]) {
                return false;
            }
            return _this.getEntry(id);
        };
        this.add = function (id, _entry) {
            _this.entries[id] = {
                time: (_this.now = +new Date()),
            };
        };
        this.drop = function (age) {
            _this.timeout = null;
            _this.now = +new Date();
            Object.keys(_this.entries).forEach(function (_id) {
                var it = _this.entries[_id];
                if (it && (age || _this.options.age) > _this.now - it.time) {
                    return;
                }
                delete _this.entries[_id];
            });
        };
        this.options = __assign(__assign({}, this.options), opt);
    }
    Deduplicator.prototype.getEntry = function (id) {
        var it = this.entries[id] ||
            (this.entries[id] = {
                time: 0,
            });
        it.time = this.now = +new Date();
        if (!this.timeout) {
            this.timeout = setTimeout(this.drop, this.options.age + 9);
        }
        return it;
    };
    return Deduplicator;
}());
exports.default = Deduplicator;
//# sourceMappingURL=deduplicator.js.map