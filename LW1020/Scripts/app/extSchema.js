define(function () {
    "use strict";

    var cols = [
       { title: "Delete", width: 45, template: "<input type='checkbox' class='chkbox' />", attributes: { class: "align-center" } },
       //{ field: "status", title: "Billed/Unbilled", headerTemplate: "<div>Billed/</div><div>Unbilled</div>", width: 50, headerAttributes: { style: "text-align: center" }, attributes: { class: "align-center" } },
       { field: "status", title: "Billed/Unbilled", headerTemplate: "<div>Billed/</div><div>Unbilled</div>", width: 55, headerAttributes: { "class": "wrap-header" }, attributes: { class: "align-center" } },
       { field: "id", width: 50, format: "{0:00000}", hidden: true },
       { field: "name", title: "Timekeeper Name", width: 160, template: "<span title='${name}'>${name}</span>", headerAttributes: { "class": "wrap-header" } },   // Add tooltip: http://jsfiddle.net/OnaBai/8U6rg/3/
       { field: "lvl", width: 30, hidden: true },
       { field: "title", title: "Title", width: 95, template: "<span title='${title}'>${title}</span>", headerAttributes: { "class": "wrap-header" } },
       { field: "loc", title: "Loc", width: 50, attributes: { class: "align-center" }, headerAttributes: { "class": "wrap-header" } },
       { field: "dep", title: "Dept", width: 50, attributes: { class: "align-center" }, headerAttributes: { "class": "wrap-header" } },
       { field: "hrsBill", title: "Hours Billed", headerTemplate: "<div>Hours</div><div>Billed</div>", width: 60, format: "{0:n2}", headerAttributes: { "class": "wrap-header"}, attributes: { class: "align-right" }, footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>" },
       { field: "amtBill", title: "Amount Billed $", headerTemplate: "<div>Amount</div><div>Billed $</div>", format: "{0:n2}", headerAttributes: { "class": "wrap-header"}, attributes: { class: "align-right" }, footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>" },
       { field: "rateBlend", title: "Blended Rate", headerTemplate: "<div>Blended</div><div>Rate</div>", width: 70, format: "{0:n2}", headerAttributes: { "class": "wrap-header"}, attributes: { class: "align-right" } },
       { field: "hrsProp", title: "Prop Hours", width: 75, format: "{0:n2}", headerAttributes: { "class": "wrap-header" }, attributes: { class: "align-right" }, footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>", editor: editNoSpinners },
       { field: "rateProp", title: "Prop Rate", width: 75, format: "{0:n2}", headerAttributes: { "class": "wrap-header" }, attributes: { class: "align-right" }, editor: editNoSpinners },
       {
           field: "calcProp", title: "Prop Calc", format: "{0:n2}", headerAttributes: { "class": "wrap-header"}, attributes: { class: "align-right" },
           footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>"
           // editable via code, but read-only via GUI: http://jsfiddle.net/inikolova/H6tgv/9/ 
           //editor: function (container, options) { $("<span>" + options.model.calcProp + "</span>").appendTo(container); }
       },
       { field: "conv1", hidden: true },
       { field: "conv2", hidden: true },
       { field: "conv3", hidden: true }

       // Multi-year projection: Grid columns order matter
       //{ field: "rate1", title: "Total Prop Rate 1", format: "{0:n2}", attributes: { class: "align-right" }, template: kendo.template($("#tmplConv1").html()) },
       //{
       //    field: "calc1", title: "Total Prop Calc 1", format: "{0:n2}", attributes: { class: "align-right" },
       //    footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>"
       //},
       //{ field: "rate2", title: "Total Prop Rate 2", format: "{0:n2}", attributes: { class: "align-right" }, template: kendo.template($("#tmplConv2").html()) },
       //{
       //    field: "calc2", title: "Total Prop Calc 2", format: "{0:n2}", attributes: { class: "align-right" },
       //    footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>"
       //},
       //{ field: "rate3", title: "Total Prop Rate 3", format: "{0:n2}", attributes: { class: "align-right" }, template: kendo.template($("#tmplConv3").html()) },
       //{
       //    field: "calc3", title: "Total Prop Calc 3", format: "{0:n2}", attributes: { class: "align-right" },
       //    footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>"
       //}
    ],
    data = [
       { status: "B", id: "02947", name: "BURNHAM, DANIEL C", lvl: 1, title: "PARTNER", loc: "SD", dep: "Corp.", hrsBill: 112.30, amtBill: 70226.22, rateBlend: 555, hrsProp: 0, rateProp: 0, calcProp: 0 },
       { status: "U", id: "02616", name: "FRENCH, SCOTT Y", lvl: 1, title: "ASSOCIATE, JR.", loc: "LA", dep: "Corp.", hrsBill: 2.00, amtBill: 918.00, rateBlend: 666, hrsProp: 0, rateProp: 0, calcProp: 0 },
       { status: "U", id: "00873", name: "LEBRON, ANTHONY P", lvl: 5, title: "PARALEGAL", loc: "DC", dep: "Corp.", hrsBill: 1.60, amtBill: 369.74, rateBlend: 777, hrsProp: 0, rateProp: 0, calcProp: 0 }
    ],
    // http://docs.telerik.com/kendo-ui/api/javascript/data/model#model.define
    // http://www.telerik.com/forums/the-parse-function-of-kendo-data-model-not-triggered-when-create-a-new-model
    // http://stackoverflow.com/questions/14266647/creating-a-column-in-kendogrid-that-is-not-bound-to-datasource
    model = kendo.data.Model.define({
        id: "id",
        fields: {
            status: {},
            id: {},
            name: {},
            title: {},
            lvl: { type: "number", defaultValue: 0 },
            loc: {},
            dep: {},
            hrsBill: { type: "number", defaultValue: 0 },
            amtBill: { type: "number", defaultValue: 0 },
            rateBlend: { type: "number", defaultValue: 0 },
            hrsProp: { type: "number", defaultValue: 0, validation: { min: 0, required: true } },
            rateProp: { type: "number", defaultValue: 0, validation: { min: 0, required: true } },
            calcProp: { type: "number", defaultValue: 0 },
            conv1: {},
            conv2: {},
            conv3: {},

            // Multi-year projection: Model fields order don't matter, just grid columns, ie. var cols (see above)
            rate1: { type: "number", defaultValue: 0 },
            calc1: { type: "number", defaultValue: 0 },
            rate2: { type: "number", defaultValue: 0 },
            calc2: { type: "number", defaultValue: 0 },
            rate3: { type: "number", defaultValue: 0 },
            calc3: { type: "number", defaultValue: 0 }
        }
    }),
    flds = {
        status: {},
        id: {},
        name: {},
        title: {},
        lvl: { type: "number", defaultValue: 0 },
        loc: {},
        dep: {},
        hrsBill: { type: "number", defaultValue: 0 },
        amtBill: { type: "number", defaultValue: 0 },
        rateBlend: { type: "number", defaultValue: 0 },
        hrsProp: { type: "number", defaultValue: 0, validation: { min: 0, required: true } },
        rateProp: { type: "number", defaultValue: 0, validation: { min: 0, required: true } },
        calcProp: { type: "number", defaultValue: 0 },
        conv1: {},
        conv2: {},
        conv3: {},

        // Multi-year projection: Model fields order don't matter, just grid columns, ie. var cols (see above)
        rate1: { type: "number", defaultValue: 0 },
        calc1: { type: "number", defaultValue: 0 },
        rate2: { type: "number", defaultValue: 0 },
        calc2: { type: "number", defaultValue: 0 },
        rate3: { type: "number", defaultValue: 0 },
        calc3: { type: "number", defaultValue: 0 }
    },
    // http://blog.falafel.com/aggregates-with-kendo-datasource/
    aggrs = [
       { field: "hrsBill", aggregate: "sum" },
       { field: "amtBill", aggregate: "sum" },
       { field: "hrsProp", aggregate: "sum" },
       { field: "calcProp", aggregate: "sum" },

       { field: "calc1", aggregate: "sum" },
       { field: "calc2", aggregate: "sum" },
       { field: "calc3", aggregate: "sum" }
    ],
    ds = new kendo.data.DataSource({
        //data: data,
        schema: { model: model },
        aggregate: aggrs
    }),

    // Remove spinners from numeric field in Grid
    // http://stackoverflow.com/questions/14396036/remove-spinners-from-numeric-field-in-grid
    // http://www.telerik.com/forums/don-t-show-spinners-on-numeric-textboxes-in-grid
    editNoSpinners = function (container, options) {
        $('<input data-text-field="' + options.field + '" ' +
                'data-value-field="' + options.field + '" ' +
                'data-bind="value:' + options.field + '" ' +
                'data-format="' + options.format + '"/>')
                .appendTo(container)
                .kendoNumericTextBox({
                    spinners: false
                });
    };

    return {
        cols: cols,
        model: model,
        flds: flds,
        aggrs: aggrs,
        ds: ds,
        editNoSpinners: editNoSpinners
    };
});