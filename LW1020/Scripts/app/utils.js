// VB: CalcAllocation
define(function () {
    "use strict";

    var wtAmts = function () {
        //$.each(modRates, function (idx, val) {
        //    console.groupCollapsed(val);
        //    $.each(yrPcts, function (ctr, item) {
        //        console.log('--> ' + item);
        //    });
        //    console.groupEnd();
        //});

        //var yrPcts = [1],
        var yrPcts = [0.0167, 0.2, 0.2, 0.2, 0.2, 0.1833],    // *** This needs to be passed in ***
            modRates = [830, 835, 885],
            hrs = 51.8,
            rtIncr = 0.05,
            fvYr = 0,       // If start date is in future, number of years from today
            arrYrs = [];

        //[
        //    Year0 --> [{rate: 795, amt: 985}, {rate: 225, amt: 350}, {rate: 450, amt: 625}]
        //    Year1		            "			        "			            "
        //    Year2		                               ...
        //    Year3		                               ...
        //    Year4
        //    Year5		            "			        "			            "
        //]
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
        // http://blog.tompawlak.org/number-currency-formatting-javascript
        // http://openexchangerates.github.io/accounting.js/
        // http://numeraljs.com/
        $.each(yrPcts, function (ctr, item) {
            var arrLine = [];
            $.each(modRates, function (idx, val) {
                var yrNum = fvYr + ctr;
                var fv = fvCalc(val, rtIncr, yrNum, 1);
                arrLine.push({ rate: fv.toFixed(2), amt: (fv * item * hrs).toLocaleString('en-US', { minimumFractionDigits: 2 }) });
            });
            arrYrs.push(arrLine);
        });

        return arrYrs;
    },
    mnthAlloc = function (day, mnths) {
        //  Last day of month: 
        //  Feb: month=1
        //- moment(new Date(2015, month)).endOf('month').format('MM/DD/YYYY')
        var start = moment(day),
            perPct = round(1 / mnths, 4),
            totPct = 0,
            result = [],
            perEnd;

        for (var i = 0; i < mnths ; i++) {
            if (i === mnths - 1) perPct = round(1 - totPct, 4);       // Checking for the last record and forcing the percent to add up to 100 and not go over 100%.
            perEnd = moment(start).add(i, 'months').endOf('month').format('MM/DD/YYYY');
            result.push(new pctItem(perEnd, perPct));
            totPct += perPct;
        }
        return result;
    },
    yrAlloc = function (day, mnths) {
        var start = moment(day),
            end = moment(start).add(mnths - 1, 'months'),           // clone start: moment(start)
            yrsStart = start.diff(moment(), 'years'),
            yrsTotal = end.get('years') - start.get('years') + 1,   // end.diff(start, 'years')
            totPct = 0,
            result = [],
            perStart, perEnd, perMnths, perPct;

        for (var i = 0; i < yrsTotal; i++) {
            perEnd = moment(new Date(start.get('years') + i, 11));          // 11=December
            if (i === 0)
                perStart = start;
            else
                perStart = moment(new Date(start.get('years') + i, 0));     // 0=January
            perMnths = perEnd.get('months') - perStart.get('months') + 1;
            perPct = round(perMnths / mnths, 4);
            if (i === yrsTotal - 1) perPct = round(1 - totPct, 4);          // Checking for the last record and forcing the percent to add up to 100 and not go over 100%.
            result.push(new pctItem(start.get('years') + i, perPct));
            totPct += perPct;
        }
        return result;
    },
    // http://www.purplemath.com/modules/expofcns4.htm :  FV = P*(1+r/n)^nt
    //                                                    - OR- P*(1+r)^(startYr - currYr)*(1+r)^(futureYr - startYr)                                                                   
    fvCalc = function (P, r, t) { // Assume annual, ie. n=1
        return P * Math.pow((1 + r), t);
    },
    // FV = P*(1+r)^(startYr - currYr)*[1+(futureYr - startYr)*r]^(futureYr - startYr)  
    // --> VB: buildAllocationArray()
    //fvMthCalc = function (P, r, futureYr, startYr) {
    //    var currYr = (new Date()).getFullYear(),
    //        diff = startYr - currYr,
    //        dura = futureYr - startYr;
    //    return P * Math.pow((1 + r), diff) * Math.pow(1 + dura * r, dura);
    //},
    fvMthCalc = function (P, r, diff, dura) {
        return P * Math.pow((1 + r), diff) * Math.pow(1 + dura * r, dura);
    },
    pctMthDist = function (rate, hrs) {
        var currYr = (new Date()).getFullYear(),
            startYr = (new Date(this.day)).getFullYear(),
            pctIncr = this.incr / 100,
            diff = startYr - currYr,
            futureYr, dura;
        
        // Populate in _multiYrProj.cshtml: pctDist, yrs, day, mnths & incr
        for (var i = 0; i < this.mnths; i++) {
            futureYr = (new Date(this.pctDist[i].dte)).getFullYear();
            dura = futureYr - startYr;
            this.pctDist[i].yr = (new Date(this.pctDist[i].dte)).getFullYear();         // use for grouping
            this.pctDist[i].rate = fvMthCalc(rate, pctIncr, diff, dura);                // use for grouping
            this.pctDist[i].wthrs = this.pctDist[i].pct * hrs;
            this.pctDist[i].wtrate = this.pctDist[i].pct * this.pctDist[i].rate;
            this.pctDist[i].wtamnt = this.pctDist[i].wthrs * this.pctDist[i].rate;
        }

        // http://stackoverflow.com/questions/22954066/group-by-and-aggregation-on-json-array-using-underscore-js
        var result = _.chain(this.pctDist)
            .groupBy("yr")
            .map(function (value1, key1) {
                return _.chain(value1)
                    .groupBy("rate")
                    .map(function (value2, key2) {
                        return {
                            yr: key1,
                            rate: key2,
                            wthrs: sum(_.pluck(value2, "wthrs")),
                            wtamnt: sum(_.pluck(value2, "wtamnt"))
                        }
                    })
                    .value();
            })
            .value();
        // Weighted rate & amount
        var WtRate = _.reduce(_.pluck(this.pctDist, 'wtrate'), function (memo, value) { return memo + value; });
        var WtAmt = _.reduce(_.pluck(this.pctDist, 'wtamnt'), function (memo, value) { return memo + value; });

        var ans = new Array();
        for (var i = 0; i < result.length; i++) {
            ans.push({ 'year': result[i][0].yr, 'rate': result[i][0].rate, 'calc': result[i][0].wtamnt });
        }
        ans.push({ 'year': 9999, 'rate': WtRate, 'calc': WtAmt });

        return ans;
    },
    // http://www.jacklmoore.com/notes/rounding-in-javascript/
    round = function (value, decimals) {    
        return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
    },
    pctItem = function (dte, pct, rate, wthrs, wtrate, wtamnt) {
        this.dte = dte;
        this.pct = pct;
    };

    function sum(numbers) {
        return _.reduce(numbers, function (result, current) {
            return result + parseFloat(current);
        }, 0);
    }

    return {
        mnthAlloc: mnthAlloc,
        yrAlloc: yrAlloc,
        fvCalc: fvCalc,
        fvMthCalc: fvMthCalc,
        pctMthDist: pctMthDist,
        //wtAmts: wtAmts,               // Not used
        pctItem: pctItem,
        round: round
    };
});