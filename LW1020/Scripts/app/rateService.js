// http://stackoverflow.com/questions/336859/var-functionname-function-vs-function-functionname
// http://verekia.com/requirejs/build-simple-client-side-mvc-app-require-js
// VB: getTkRates
define(function () {
    //var rateService = function ($) {
    "use strict";

    var parm = function (id, lvl, code, curr) {
        this.id = id;           // sp_RateTimekeeperRoster >> ttk
        this.lvl = lvl;         // sp_RateTimekeeperRoster >> tilevel
        this.code = code;       // sp_RateRatesList >> rtCode
        this.curr = curr;       // sp_RateRatesList >> rtCurr
    },
    // http://stackoverflow.com/questions/17595297/jquery-deferred-when-with-multiple-objects
    getAllRates = function (ary) {
        var def = $.Deferred(),
            promises = $.map(ary, function (item, idx) {
                return getTkRates.apply(this, item);
            });

        $.when.apply($, promises).then(function () {
            var arr = [];
            $.each(arguments, function (idx, item) {
                //console.groupCollapsed(item[0].id);
                //$.each(item, function (cntr, current) {
                //    console.log('Index: ' + cntr + ' -->  ' + current.id + ', ' + current.rate + ', ' + current.conv);
                //});
                //console.groupEnd();
                arr.push(item);
            });
            def.resolve(arr);
        }, function (err) {
            def.reject(err);
        });

        return def.promise();
    },
    // No specific parameters defined, access via the unnamed "arguments" object
    getTkRates = function () {
        var def = $.Deferred(),
            promises = $.map(arguments, function (item, idx) {
                return getModelRate(item);
            });

        $.when.apply($, promises).then(function (r1, r2, r3) {
            // Assume 3 responses
            def.resolve([].concat(r1).concat(r2).concat(r3));
        }, function (err) {
            def.reject(err);
        });

        return def.promise();
    },
    getModelRate = function () {
        var _conv = 'N',
            _rate = 0,
            def = $.Deferred(),
            args = Array.prototype.slice.call(arguments)[0];

        // http://stackoverflow.com/questions/13951456/using-deferred-with-nested-ajax-calls-in-a-loop?rq=1 [Multiple jquery promises]
        // http://www.htmlgoodies.com/beyond/javascript/making-promises-with-jquery-deferred.html
        if (args.code !== undefined) {
            if (args.code > 50) {
                getRate(args.code, args.curr)
                    .then(function (data, status, xhr) {    // done [getRate]
                        if (JSON.stringify(data) !== "[]") {
                            var rate = data[0]['rlev' + args.lvl.pad()] || 0;
                            if (rate > 0) {
                                _rate = rate;
                                def.resolve({ 'id': args.id, 'rate': _rate, 'conv': _conv });
                            } else {
                                getTimeRate(args.id, args.curr)
                                    .then(function (data, status, xhr) {    // done [getTimeRate]
                                        if (JSON.stringify(data) !== "[]") {
                                            _conv = 'Y';
                                            if (data[0].tkrtcur !== args.curr)
                                                _rate = data[0].cnvrt01 || 0;
                                            else
                                                _rate = data[0].tkrt01 || 0;
                                        }
                                        def.resolve({ 'id': args.id, 'rate': _rate, 'conv': _conv });
                                    }, function (xhr, status, err) {        // fail [getTimeRate]
                                        toastr.error('getTimeRate: ' + args.id + ', ' + args.curr, err);
                                        def.reject(err + '; getTimeRate: ' + args.id + ', ' + args.code + ', ' + args.curr);
                                    });
                            }
                        } else {
                            def.resolve({ 'id': args.id, 'rate': _rate, 'conv': _conv });
                        }
                    }, function (xhr, status, err) {        // fail [getRate]
                        toastr.error('getRate: ' + args.code + ', ' + args.curr, err);
                        def.reject(err + '; getRate: ' + args.id + ', ' + args.code + ', ' + args.curr);
                    });

            } else {
                getTimeRate(args.id, args.curr)
                    .then(function (data, status, xhr) {
                        if (JSON.stringify(data) !== "[]") {
                            if (data[0].tkrtcur !== args.curr) {
                                _conv = 'Y';
                                _rate = data[0].cnvrt01 || 0;
                            } else {
                                if ((data[0]['tkrt' + args.code.pad()] || 0) > 0)
                                    _rate = data[0]['tkrt' + args.code.pad()] || 0;
                                else
                                    _rate = data[0].tkrt01 || 0;
                            }
                        }
                        def.resolve({ 'id': args.id, 'rate': _rate, 'conv': _conv });
                    }, function (xhr, status, err) {        // fail [getTimeRate]
                        toastr.error('getTimeRate: ' + args.id + ', ' + args.curr, err);
                        def.reject(err + '; getTimeRate: ' + args.id + ', ' + args.curr);
                    });
            }
        } else {
            def.resolve({ 'id': args.id, 'rate': _rate, 'conv': _conv });
        }

        return def.promise();
    },
    getRate = function (code, curr) {
        return $.get($.url('api/Modeler/GetRateList'), { 'code': code, 'curr': curr }, null, 'jsonData');
    },
    getTimeRate = function (id, curr) {
        return $.get($.url('api/Modeler/GetTimeRateList'), { 'id': id, 'curr': curr }, null, 'jsonData');
    };

    // http://stackoverflow.com/questions/2998784/how-to-output-integers-with-leading-zeros-in-javascript
    Number.prototype.pad = function (size) {
        var s = String(this);
        while (s.length < (size || 2)) { s = "0" + s; }
        return s;
    };

    // Not used
    // http://www.make-awesome.com/2012/11/jquery-postjson-method-for-asp-net-mvc/
    $.postJSON = function (url, data) {
        var o = {
            url: url,
            type: "POST",
            dataType: "json",
            contentType: 'application/json; charset=utf-8'
        };
        if (data !== undefined) {
            o.data = JSON.stringify(data);
        }
        return $.ajax(o);
    };

    return {
        parm: parm,
        getModelRate: getModelRate,     // TESTING only
        getTkRates: getTkRates,         // TESTING only
        getAllRates: getAllRates
    };
    //}(jQuery);
});