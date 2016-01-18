/*
function globalStore() {
   // http://stackoverflow.com/questions/1535631/static-variables-in-javascript
}
*/
globalStore = {};

require(['extSchema', 'rateService', 'utils'], function (extSchema, rateService, utils) {
   "use strict";

   var rtModels = {},
   onChangefromPicker = function () {
      var val = this.value(),
          toVal = toPicker.value();

      if (toVal != null) {
         if (moment(toVal).diff(val, 'months', true) < 0)
            toastr.error('From date must be before To date');
         if (moment(toVal).diff(val, 'months', true) > 36)
            toastr.error('Maximum period range is 36 months');
      }
   },
   onChangetoPicker = function () {
      var val = this.value(),
          fromVal = fromPicker.value();

      if (fromVal != null) {
         if (moment(val).diff(fromVal, 'months', true) < 0)
            toastr.error('To date must be after From date');
         if (moment(val).diff(fromVal, 'months', true) > 36)
            toastr.error('Maximum period range is 36 months');
      }
   },
   fromPicker = $("#fromDate").kendoDatePicker({
      depth: "year",
      start: "year",
      format: "MMyy",
      parseFormats: ["MMyy"],
      min: new Date(1980, 11, 1),
      change: onChangefromPicker      // Anonymous function must be defined before invocation, not the case with a named function
   }).data("kendoDatePicker"),
   toPicker = $("#toDate").kendoDatePicker({
      depth: "year",
      start: "year",
      format: "MMyy",
      parseFormats: ["MMyy"],
      min: new Date(1980, 11, 1),
      change: onChangetoPicker
   }).data("kendoDatePicker");

   fromPicker.enable(false);
   toPicker.enable(false);

   $("#spnFrom, #spnTo").kendoValidator({   // Do NOT place on "#fromDate, #toDate"
      rules: {
         valid: function (e) {
            var val = $(e).val().trim(),
               valid = moment(val, ['MMYY'], true).isValid();       // kendo.parseDate is BUGGY.
            if (val != '' && !valid) {
               return false;
            }
            return true;
         }
      },
      messages: {
         valid: 'Invalid date'
      }
   });

   // Intially display empty DDLs to prevent "flashing" when populated.
   var ddl1 = $('#ddlModel1').kendoDropDownList({ dataSource: ["Select rate model 1"] }).getKendoDropDownList(),
       ddl2 = $('#ddlModel2').kendoDropDownList({ dataSource: ["Select rate model 2"] }).getKendoDropDownList(),
       ddl3 = $('#ddlModel3').kendoDropDownList({ dataSource: ["Select rate model 3"] }).getKendoDropDownList();

   ddl1.enable(false);
   ddl2.enable(false);
   ddl3.enable(false);

   populateRateDDLs();

   var grdTk = $("#grdTk").kendoGrid({
      autoBind: false,
      columns: extSchema.cols,
      dataSource: extSchema.ds,
      //height: 200,
      //selectable: 'multiple, row',
      editable: true,
      resizable: true
   }).data("kendoGrid");

   //$('#txtClient').on('keyup', function (e) {
   //    if (this.value.trim().length > 2)
   //        $('#btnSearch').prop('disabled', false);
   //    else
   //        $('#btnSearch').prop('disabled', true);
   //});

   $('#txtClient').keypress(function (e) {
      if (e.which == 13) $('#btnSearch').trigger('click');
   });

   $('input[name="rbType"]').click(function () {
      if ($(this).val() === 'Matter') {           // OR $('input[name=rbType]:checked').val() / $('#rbType:checked').val()
         $('#chkSound').prop('disabled', true);
         $('#txtClient').prop('disabled', true).css('background-color', '#eceaea');
         $('#btnSearch').text('Continue');
      } else {
         $('#chkSound').prop('disabled', false);
         $('#txtClient').prop('disabled', false).css('background-color', '#FFFFFF');
         $('#btnSearch').text('Search');
      }
   });

   $('input[name="rbPeriod"]').click(function () {
      if ($('#divPeriod').is(':enabled')) {
         if ($(this).val() === 'Year') {
            fromPicker.value(null);
            toPicker.value(null);
            fromPicker.enable(false);
            toPicker.enable(false);

            $("#fromDate").siblings("span.k-tooltip-validation").hide();
            $("#toDate").siblings("span.k-tooltip-validation").hide();
         } else {
            fromPicker.enable(true);
            toPicker.enable(true);
            //$(".k-datepicker input").prop("readonly", true);      // Disable manual entry
         }
      }
   });

   $('#btnSearch').click(function () {
      // #region Re-initialize
      var hgt = $('#divClient').height();

      $('#divClient').text('').height(hgt);
      $('#divMatter').text('').height(hgt);
      $('#divStart').text('').height(hgt);
      $('#divDuration').text('').height(hgt);
      $('#divCurrency').text('').height(hgt);
      $('#divGroup').text('').height(hgt);

      grdTk.destroy();
      grdTk = $("#grdTk").empty().kendoGrid({
         autoBind: false,
         columns: extSchema.cols,
         dataSource: extSchema.ds,
         //height: 200,
         //selectable: 'multiple, row',
         editable: true,
         resizable: true
      }).data("kendoGrid");
      grdTk.dataSource.data([]);

      $('#btnPull').text('Pull Roster');
      //$('#btnPrj').prop('disabled', true);

      utils.pctDist = undefined;
      utils.yrs = undefined;
      utils.day = undefined;
      utils.mnths = undefined;
      utils.incr = undefined;
      // #endregion

      if ($('[name=rbType]:checked').val() === 'Client')
         openWinClient();
      else
         openWinMatter();

   });

   // http://blog.falafel.com/kendo-grid-using-a-calculated-default-value/
   // http://stackoverflow.com/questions/17205595/how-to-change-columns-set-of-kendo-grid-dynamically
   $("#btnPull").on("click", function () {
      kendo.ui.progress($("#divTk"), true);

      var mod1 = $('#ddlModel1').getKendoDropDownList().value().split('|'),      // rtCurr | rtCode | rtCurrSymbol | rtDesc  <--  EXEC son_dbrpt.dbo.sp_RateRatesList ''
         mod2 = $('#ddlModel2').getKendoDropDownList().value().split('|'),       // OR $('#ddlModel2').data("kendoDropDownList").value()
         mod3 = $('#ddlModel3').getKendoDropDownList().value().split('|'),
         per = $('input:radio[name=rbPeriod]:checked').val(),                    // Year | Period
         beg = kendo.toString(fromPicker.value(), "MMyy"),                       // reg = /^[0-1]{1}\d{1}\d{2}$/;       // MMYY format
         end = kendo.toString(toPicker.value(), "MMyy"),                         // reg.test(from)
         bil = $("#chkBilled").is(":checked"),
         unb = $("#chkUnbilled").is(":checked"),
         tot = grdTk.dataSource.total();

      rtModels.curr1 = mod1[0];
      rtModels.code1 = parseInt(mod1[1]) || undefined;
      rtModels.currSymbol1 = mod1[2];
      rtModels.desc1 = mod1[3];

      rtModels.curr2 = mod2[0];
      rtModels.code2 = parseInt(mod2[1]) || undefined;
      rtModels.currSymbol2 = mod2[2];
      rtModels.desc2 = mod2[3];

      rtModels.curr3 = mod3[0];
      rtModels.code3 = parseInt(mod3[1]) || undefined;
      rtModels.currSymbol3 = mod3[2];
      rtModels.desc3 = mod3[3];

      var addTks = grdTk.dataSource.data().some(function (elem) { return elem.status === '' });     // Added Tks via button "Add Timekeepers"
      if (per === 'Period') {
         checkPeriod(beg, end).then(function (data) {
            switch (data) {
               case 0:
                  if (addTks || isParmsClean(per, beg, end, bil, unb, tot))
                     getNewRateStructures();
                  else
                     getTks();
                  break;
               case 1:
                  toastr.error('Invalid Ending period, please re-enter.');
                  kendo.ui.progress($("#divTk"), false);
                  break;
               case 2:
                  toastr.error('Invalid Beginning period, please re-enter.');
                  kendo.ui.progress($("#divTk"), false);
                  break;
               case 3:
               default:
                  toastr.error('Period needs to be within 3 years, please re-enter.');
                  kendo.ui.progress($("#divTk"), false);
                  break;
            }
         }, function (xhr) {
            toastr.error('checkPeriod: ' + xhr.statusText);
            kendo.ui.progress($("#divTk"), false);
         });
      } else {
         if (addTks || isParmsClean(per, beg, end, bil, unb, tot))
            getNewRateStructures();
         else
            getTks();
      }

   });

   $('#btnDel').on('click', function () {
      /*** Even with multiple selections, only delete one row at a time.   
      //$("#grdTk").find("input:checked").each(function () {
      $('.chkbox:checked').each(function () {
         grdTk.removeRow($(this).closest('tr'));
      })
      */

      var data = grdTk.dataSource.data(),
         len = data.length;

      if ($("#grdTk").find("input:checked").length == 0) {
         toastr.warning('No timekeepers selected');
      } else {
         while (len--) {
            if (data[len].dirty)
               grdTk.dataSource.remove(data[len]);
         }
      }

      // Reset grid height
      // $('#grdTk > .k-grid-content').css({ 'height': '175px' });
   });

   // #region TESTING
   //$('#btnDel').on('click', function () {
   //    //$('.chkbox:checked').each(function (e) {
   //    //    grdTk.removeRow($(this).closest('tr'));
   //    //});

   //    $('#grdTk').find('input:checked').each(function (e) {
   //        grdTk.removeRow($(this).closest('tr'));
   //    });

   //    // #region Archive
   //    //var day = new Date(2018, 5),    // June 1, 2018
   //    //    mnths = parseInt($('#txtClient').val());

   //    //    alert(utils.fvMthCalc(440, 0.075, 2018, 2018).toFixed(2));
   //    //alert(JSON.stringify(utils.yrAlloc(day, mnths), true));
   //    //alert(JSON.stringify(utils.mnthAlloc(day, mnths), true));


   //    /*** --- RATE TESTING --- ***/
   //    //var fv = utils.fvCalc(850, 0.05, 2);
   //    //toastr.info('Future value: ' + fv.toFixed(2));

   //    //toastr.info(JSON.stringify(utils.wtAmts(), null, 4));
   //    //console.log(JSON.stringify(utils.wtAmts(), null, 4));

   //    //var arrAlloc = utils.wtAmts().slice(0);


   //    /*** TEMPLATE ***/
   //    //var arr1 = [];
   //    //arr1.push(new rateService.parm('08755', 50, 26, 'USD'),
   //    //          new rateService.parm('08755', 50, 59, 'USD'),
   //    //          new rateService.parm('08755', 50, 62, 'USD'));
   //    //var arr2 = [];
   //    //arr2.push(new rateService.parm('30620', 7, 19, 'USD'),
   //    //          new rateService.parm('30620', 7, 31, 'USD'),
   //    //          new rateService.parm('30620', 7, 89, 'USD'));
   //    //var arr3 = [];
   //    //arr3.push(new rateService.parm('08757', 50, 19, 'USD'),
   //    //          new rateService.parm('08757', 50, 31, 'USD'),
   //    //          new rateService.parm('08757', 50, 89, 'USD'));
   //    //var arr = [];
   //    //arr.push(arr1, arr2, arr3);
   //    //arr.push(arr1);

   //    //rateService.getAllRates(arr)
   //    //    .then(function (data) {
   //    //        console.log(JSON.stringify(data, null, 4));
   //    //        toastr.info(JSON.stringify(data, null, 4));
   //    //    }, function (err) {
   //    //        toastr.error(err);
   //    //    });
   //    /**************/

   //    //ans = []
   //    //$.map(arr, function (item, idx) {
   //    //    rateService.getTkRates.apply(null, item)
   //    //        .then(function (data) {
   //    //            //console.table(data);    // IE doesn't support console.table  
   //    //            toastr.info(JSON.stringify(data, null, 4));
   //    //            ans.push(data);
   //    //        }, function (err) {
   //    //            toastr.error(err);
   //    //        });
   //    //});

   //    //var arr = [];
   //    //arr.push(new rateService.parm('16100', 7, 19, 'USD'));
   //    //arr.push(new rateService.parm('16100', 7, 31, 'USD'));
   //    ////arr.push(new rateService.parm('02947', 3, 0, ''));
   //    //arr.push(new rateService.parm('16100', 7, 89, 'USD'));
   //    //rateService.getTkRates.apply(null, arr)
   //    //    .then(function(data) {
   //    //        //console.table(data);    // IE doesn't support console.table  
   //    //        toastr.info(JSON.stringify(data, null, 4));
   //    //    }, function(err) {
   //    //        toastr.error(err);
   //    //    });

   //    //var arr = [];
   //    //arr.push(new rateService.parm('00643', 1, 59, 'USD'));
   //    //rateService.getModelRate.apply(null, arr)
   //    //    .then(function (data) {
   //    //        //console.table(data);    // IE doesn't support console.table  
   //    //        toastr.info(JSON.stringify(data, null, 4));
   //    //    }, function (err) {
   //    //        toastr.error(err);
   //    //    });

   //    //rateService.getRate(62, 'USD');
   //    //rateService.getTimeRate('01256', 'USD');

   //    // http://api.jquery.com/category/deferred-object/
   //    // Callbacks are executed in the order they were added
   //    //rateService.getRate(62, 'USD')
   //    //            .then(function (data, status, xhr) {
   //    //            })
   //    //            .done(function (data, status, xhr) {
   //    //            })
   //    //            .fail(function (xhr, err, status) {
   //    //            })
   //    //            .always(function (xhr, err, status) {
   //    //            });
   //    // #endregion
   //});
   // #endregion

   $('#btnAdd').on('click', function () {
      $("#wincontainer").append("<div id='winAdd'></div>");
      $("#winAdd").kendoWindow({
         //actions: {},
         animation: {
            open: {
               effects: "slideIn:down fadeIn",
               duration: 750
            },
            close: {
               //effects: "zoom:out fade:out",
               //effects: "fadeOut"
               effects: "slideIn:down fadeOut",
               reverse: true,
               duration: 500
            }
         },
         title: 'Add a timekeeper',
         visible: false,
         width: 775,
         height: 365,
         draggable: true,
         resizable: false,
         content: { url: $.url('Pages/AddTks') },
         modal: true,
         open: function () { kendo.ui.progress($("#winAdd"), true); },
         close: function (e) {
            if (!e.userTriggered) {
               kendo.ui.progress($("#winAdd"), true);
               var grdPrjDS = $('#grdPrjHrs').data("kendoGrid").dataSource,
                  grdTkDS = $('#grdTk').data("kendoGrid").dataSource,
                  grdPrjData = grdPrjDS.data(),
                  grdTkData = grdTkDS.data().toJSON(),
                  tksAdded = [];

               grdPrjData.forEach(function (elem) {
                  for (var i = 1; i <= elem.qtyEmp; i++) {
                     /* SLOW PROCESS
                     grdTkDS.add({
                           status: '',
                           id: elem.tkid,
                           name: elem.name,
                           lvl: elem.level,
                           title: elem.title,
                           loc: elem.loc,
                           dep: elem.dept,
                           hrsBill: 0,
                           amtBill: 0,
                           rateBlend: 0,
                           hrsProp: elem.totHrs,
                           rateProp: 0,
                           calcProp: 0,

                           rate1: 0,   //Resolve error: Unable to get property 'toFixed' of undefined or null reference
                           rate2: 0,   //--> Templates: tmplConv1..3
                           rate3: 0,
                           calc1: 0,
                           calc2: 0,
                           calc3: 0,
                     });
                     */
                     tksAdded.push({
                        status: '',
                        id: elem.tkid,
                        name: elem.name,
                        lvl: elem.level,
                        title: elem.title,
                        loc: elem.loc,
                        dep: elem.dept,
                        hrsBill: 0,
                        amtBill: 0,
                        rateBlend: 0,
                        hrsProp: elem.totHrs,
                        rateProp: 0,
                        calcProp: 0,

                        rate1: 0,   //Resolve error: Unable to get property 'toFixed' of undefined or null reference
                        rate2: 0,   //--> Templates: tmplConv1..3
                        rate3: 0,
                        calc1: 0,
                        calc2: 0,
                        calc3: 0,
                     });
                  }
               });
               grdTkDS.data(_.union(grdTkData, tksAdded));

               if (grdTkDS.total() > 0) {
                  enableRates(true, true);

                  disableBtns(false);
                  $('#btnPull').text(' ReCalc ');
                  $("#btnPull").trigger('click');
               }
            }
         },
         deactivate: function () { this.destroy(); }
      }).data("kendoWindow").center().open();
   });

   $('#btnPrj').on('click', function () {
      // http://jsfiddle.net/latenightcoder/DmAMc/
      // http://demos.telerik.com/kendo-ui/window/animation
      $("#wincontainer").append("<div id='winPrj'></div>");
      $("#winPrj").kendoWindow({
         //actions: {},
         animation: {
            open: {
               effects: "slideIn:down fadeIn",
               duration: 750
            },
            close: {
               //effects: "zoom:out fadeOut",
               //effects: "fadeOut"
               effects: "slideIn:down fadeOut",
               reverse: true,
               duration: 500
            }
         },
         title: 'Multi-Year Projection',
         visible: false,
         width: 550,
         height: 300,
         draggable: true,
         resizable: false,
         content: { url: $.url('Pages/MultiYrProj') },
         modal: true,
         close: function (e) { if (!e.userTriggered) $("#btnPull").trigger('click'); },
         deactivate: function () { this.destroy(); }
      }).data("kendoWindow").center().open();
   });

   // http://geekswithblogs.net/rgupta/archive/2014/06/23/downloading-file-using-ajax-and-jquery-after-submitting-form-data.aspx
   // http://stackoverflow.com/questions/16670209/download-excel-file-via-ajax-mvc
   // http://slodge.blogspot.com/2012/09/downloading-dynamic-excel-files-from.html
   $('#btnExl').on('click', function () {
      if (grdTk.dataSource.total()) {
         kendo.ui.progress($("#divMain"), true);
         var hdrs = [];
         $.each(grdTk.columns, function (idx, item) {
            if (item.field !== undefined && (item.hidden === undefined || !item.hidden))
               hdrs.push({ field: item.field, title: item.title });
         });

         // Update 1st record: convert integer to decimal to prevent loss of decimals from other records within same field
         // JsonConvert.DeserializeObject<DataTable>(gridData): A column dataType is based on the first record in the result set.
         var row = grdTk.dataSource.at(0);
         $.map(Object.keys(row), function (item) {
            if (item != 'lvl' && $.isInt(row[item])) {
               row[item] = row[item] + 1e-10;
            }
         })
         $.post($.url('Pages/GenerateExcel'), {
            'colsDef': JSON.stringify(hdrs), 'gridData': JSON.stringify(grdTk.dataSource.data()),
            'client': $('#divClient').text(), 'matter': $('#divMatter').text(),
            'currency': $('#divCurrency').text(), 'rateGrp': $('#divGroup').text(),
            'start': $('#divStart').text(), 'duration': $('#divDuration').text()
         }).done(function (data) {
            window.location = $.url('Pages/DownloadExcel') + "?fName=" + data.fileName;
         }).fail(function (xhr, status, err) {
            toastr.error('GenerateExcel: ' + err);
         }).always(function () {
            kendo.ui.progress($("#divMain"), false);
         });

         // Log user
         //$.post($.url('/Pages/LogUserInfo'));
      } else {
         toastr.info('No data to export');
      }
   })

   /*
   // http://dojo.telerik.com/uvuco/2, http://dojo.telerik.com/oVEV/7
   $('#addCol').click(function () {
       extSchema.cols.push({ field: "totPrjRate1", title: "Total Prop Rate 1", format: "{0:n2}", width: "100px", attributes: { class: "align-right" } });
       extSchema.cols.push({ field: "totPrjCalc1", title: "Total Prop Calc 1", format: "{0:n2}", width: "100px", attributes: { class: "align-right" }, footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>" });

       extSchema.aggrs.push({ field: "totPrjCalc1", aggregate: "sum"});
       extSchema.ds.aggregate(extSchema.aggrs);

       grdTk.destroy();            // http://docs.telerik.com/kendo-ui/framework/widgets/destroy
       $("#grdTk").empty();

       grdTk = $("#grdTk").kendoGrid({
           //autoBind: false,
           columns: extSchema.cols,
           dataSource: extSchema.ds,
           //height: 200,
           //selectable: 'multiple, row',
           resizable: true,
           editable: { confirmation: false },
       }).data("kendoGrid");

       // http://www.telerik.com/forums/kendo-grid-horizontal-scroll-bar
   });
   */
   // #region Events/Functions
   var openWinClient = function () {
      var entry = $('#txtClient').val();
      if ($.isNumeric(entry)) {
         globalStore.cliNum = entry;          //window.gcliNum = entry;
         globalStore.cliName = '';
      } else {
         globalStore.cliNum = '';
         globalStore.cliName = entry;         //window.gcliName = entry;
      }
      globalStore.cliSndx = ($('#chkSound').is(':checked') ? 1 : 0);

      $("#wincontainer").append("<div id='winCli'></div>");
      $("#winCli").kendoWindow({
         //actions: {},
         animation: {
            open: {
               effects: "fadeIn",
               duration: 750
            },
            close: { effects: "fade:out" }
         },
         title: 'Expand Client & Click On Matter',
         visible: false,
         width: 400,
         height: 350,
         draggable: true,
         resizable: false,
         content: { url: $.url('Pages/PopUpClients') },
         modal: true,
         //open: function () { kendo.ui.progress($('#winCli'), true); },
         close: function (e) {
            resetRates();
            disableBtns(true);
            if (e.userTriggered) {
               enableRates(false, false);
            } else {
               enablePeriods(true);
               enableRates(true, true);
               $('#btnAdd').prop('disabled', false);
            }
         },
         deactivate: function () { this.destroy(); }
      }).data("kendoWindow").center().open();
      //.content("<img src='../../Images/load.gif' alt='Loading...'/>")
      //.refresh({
      //    url: $.url('Home/PopUpClients')
      //});
   },
   openWinMatter = function () {
      $("#wincontainer").append("<div id='winMat'></div>");
      $("#winMat").kendoWindow({
         //actions: {},
         animation: {
            open: {
               effects: "fade:in",
               duration: 750
            },
            close: { effects: "fade:out" }
         },
         title: 'Type in new Matter Name and Currency:',
         visible: false,
         width: 290,
         height: 100,
         draggable: true,
         resizable: false,
         content: { url: $.url('Pages/PopUpMatter') },
         modal: true,
         open: function () { kendo.ui.progress($('#winMat'), true); },
         close: function (e) {
            resetRates();
            disableBtns(true);
            if (e.userTriggered) {
               enableRates(false, false);
            } else {
               enablePeriods(false);
               enableRates(true, false);
               $('#btnAdd').prop('disabled', false);
               $('#divMatter').text('Matter:  ' + $('#txtName').val());
               $('#divCurrency').text('Matter\'s Currency:  ' + $('#ddlCurr').data('kendoDropDownList').value());
            }
         },
         deactivate: function () { this.destroy(); }
      }).data("kendoWindow").center().open();
   },
   selectRow = function () {
      var checked = this.checked,
         row = $(this).closest("tr"),
         dataItem = grdTk.dataItem(row);

      if (checked) {
         row.addClass("k-state-selected");
         dataItem.dirty = true;
      } else {
         row.removeClass("k-state-selected");
         dataItem.dirty = false;
      }
   },
   checkPeriod = function (from, to) {
      return $.get($.url('api/Modeler/CheckPeriod'), { 'from': from, 'to': to });
   },
   NoHeaders = function (e) {
      // Disallowed group headers selection
      var dataItem = this.dataItem(e.item.index());
      if (typeof dataItem.value === 'number') {
         e.preventDefault();
      }
   },
   getTks = function () {
      var cli = globalStore.matNum.split('-').shift(),
         mat = globalStore.matNum,
         beg = kendo.toString(fromPicker.value(), "MMyy") || '',
         end = kendo.toString(toPicker.value(), "MMyy") || '',
         his = ($('input:radio[name=rbPeriod]:checked').val() === 'Year' ? 'Y' : 'N'),
         bil = ($("#chkBilled").is(":checked") ? '1' : '0'),
         unb = ($("#chkUnbilled").is(":checked") ? '1' : '0');

      $.get($.url('api/Modeler/GetTks'),
         //{ 'client': '052409', 'matter': '052409-0001', 'begper': '0413', 'endper': '1114', 'History': 'N', 'Billed': '1', 'Unbilled': '1' },
         //{ 'client': '053345', 'matter': '053345-0000', 'begper': '', 'endper': '', 'History': 'Y', 'Billed': '1', 'Unbilled': '0' },
         {
            'client': cli, 'matter': mat, 'begper': beg, 'endper': end, 'History': his, 'Billed': bil, 'Unbilled': unb
         }, null, 'jsonData')
      .done(function (data, status, xhr) {
         if (JSON.stringify(data) !== "[]") {
            globalStore.roster = data;
            var arrIn = [];
            $.each(data, function (idx, item) {
               var id = item.ttk, lvl = item.tilevel, arrLine = [];
               arrLine.push(new rateService.parm(id, lvl, rtModels.code1, rtModels.curr1),
                           new rateService.parm(id, lvl, rtModels.code2, rtModels.curr2),
                           new rateService.parm(id, lvl, rtModels.code3, rtModels.curr3));
               arrIn.push(arrLine);
            });
            rateService.getAllRates(arrIn)      // Get rates for all Tks & 3 models
               .then(function (rates) {
                  //console.log(JSON.stringify(result, null, 4));
                  pullRoster(rates, false);
               }, function (err) {
                  toastr.error('getAllRates: ' + err);
                  kendo.ui.progress($("#divTk"), false);
               });
         } else {
            toastr.warning('No timekeeper roster available at this time');
            grdTk.dataSource.data([]);
            $("#grdTk").find('.k-grid-content tbody')
               .empty()
               .append('<tr class="kendo-data-row"><td colspan="12" style="text-align:center"><b>No timekeeper roster available at this time</b></td></tr>');
            kendo.ui.progress($("#divTk"), false);
         }
         $('#btnPull').prop('disabled', false);
         $('#btnPull').text(' ReCalc ');
      }).fail(function (xhr, status, err) {
         $('#btnPull').prop('disabled', false);
         toastr.error('GetTks: ' + err);
         kendo.ui.progress($("#divTk"), false);
      }).always(function () {
         //kendo.ui.progress($("#divTk"), false);
      });
   },
   getNewRateStructures = function () {  //*** Recalc new rates, but keep entered values for "Prop Hours", "Prop Rate" & "Prop Calc" ***
      var grid = $("#grdTk").data("kendoGrid"),
         data = grid.dataSource.data(),
         arrIn = [], arrTks = [];

      $.each(data, function (i, row) {
         var id = row.id, lvl = row.lvl, arrLine = [];
         arrLine.push(new rateService.parm(id, lvl, rtModels.code1, rtModels.curr1),
                     new rateService.parm(id, lvl, rtModels.code2, rtModels.curr2),
                     new rateService.parm(id, lvl, rtModels.code3, rtModels.curr3));
         arrIn.push(arrLine);
         // Object properties match those returned from $.get($.url('api/Modeler/GetTks'), ie. tbillstatus, ttk, tkname, etc.
         //arrTks.push({ 'tbillstatus': row.status, 'ttk': row.id, 'tkname': row.name, 'tilevel': row.lvl, 'tktitle': row.title, 'loaddr6': row.loc, 'label5': row.dep, 'tworkhrs': row.hrsProp, 'tbilldol': row.amtBill });
         arrTks.push({ 'tbillstatus': row.status, 'ttk': row.id, 'tkname': row.name, 'tilevel': row.lvl, 'tktitle': row.title, 'loaddr6': row.loc, 'label5': row.dep, 'tworkhrs': row.hrsProp, 'tbilldol': row.amtBill, 'rateProp': row.rateProp, 'calcProp': row.calcProp });
      });

      globalStore.roster = arrTks;
      rateService.getAllRates(arrIn)      // Get rates for all Tks & 3 models
         .then(function (rates) {
            pullRoster(rates, true);
         }, function (err) {
            toastr.error('getAllRates: ' + err);
            kendo.ui.progress($("#divTk"), false);
         });
   },
   pullRoster = function (rates, bReCalc) {
      // http://heyjavascript.com/4-creative-ways-to-clone-objects/
      var fldsClone = JSON.parse(JSON.stringify(extSchema.flds)),
         colsClone = JSON.parse(JSON.stringify(extSchema.cols)),        // $.extend({}, extSchema.cols)
         aggrsClone = JSON.parse(JSON.stringify(extSchema.aggrs)),
         //hrsProp = $.grep(colsClone, function (e) { return e.field == 'hrsProp'; }),
         yrs, desc, curr;

      // Re-attach editor lost in cloning process
      colsClone[11].editor = extSchema.editNoSpinners;        // 'hrsProp'
      colsClone[12].editor = extSchema.editNoSpinners;        // 'rateProp'

      //#region Schema for multi-year projection
      for (var modNo = 1; modNo <= 3; modNo++) {
         if (rtModels['code' + modNo] !== undefined) {
            desc = ' ' + rtModels['desc' + modNo];
            curr = rtModels['currSymbol' + modNo];
         } else {
            desc = '';
            curr = modNo;
         }
         if (typeof utils.pctDist !== 'undefined') {
            yrs = utils.yrs;
            for (var i = 1; i <= yrs; i++) {
               fldsClone['rate' + modNo + 'Yr' + i] = { type: "number", defaultValue: 0 };
               fldsClone['calc' + modNo + 'Yr' + i] = { type: "number", defaultValue: 0 };

               //colsClone.push({ field: 'rate1Yr' + i, title: 'Proj Year1 Rate' + i, format: "{0:n2}", attributes: { class: "align-right" }, template: kendo.template($("#tmplConv1").html()) });
               colsClone.push({ field: 'rate' + modNo + 'Yr' + i, title: 'Proj Year ' + i + desc + ' Rate ' + curr, format: "{0:n2}", headerAttributes: { "class": "wrap-header" }, attributes: { class: "align-right" } });
               colsClone.push({
                  field: 'calc' + modNo + 'Yr' + i, title: 'Proj Year ' + i + desc + ' Calc ' + curr, format: "{0:n2}", headerAttributes: { "class": "wrap-header" }, attributes: { class: "align-right" },
                  footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>"
               });

               aggrsClone.push({ field: 'calc' + modNo + 'Yr' + i, aggregate: 'sum' });
            }
         }
         // rate1..3 / calc1..3: Title can also be changed in onDataBoundgrdTk event
         //colsClone.push({ field: 'rate' + modNo, title: 'Total Proj' + desc + ' Rate ' + curr, format: "{0:n2}", attributes: { class: "align-right" }, template: kendo.template($('#tmplConv' + modNo).html()) });
         colsClone.push({
            field: 'rate' + modNo, title: 'Total Proj' + desc + ' Rate ' + curr, headerAttributes: { "class": "wrap-header" }, attributes: { class: "align-right" },
            template: kendo.template($('#tmplConv' + modNo).html())
         });
         colsClone.push({
            field: 'calc' + modNo, title: 'Total Proj' + desc + ' Calc ' + curr, format: "{0:n2}", headerAttributes: { "class": "wrap-header" }, attributes: { class: "align-right" },
            footerTemplate: "<div style='float: right'>#= kendo.toString(sum, 'n2') #</div>"
         });
      }
      //#endregion

      // #region Populate grid data
      var clients = [];
      $.each(globalStore.roster, function (idx, item) {
         if ((!$("#chkUnbilled").is(":checked") && item.tbillstatus === 'U') || (!$("#chkBilled").is(":checked") && item.tbillstatus === 'B')) {
            // Skip record
         } else if (item.tworkhrs === 0 && item.tbilldol === 0 && item.tbillstatus !== '') { // item.tbillstatus === ''  -->  Added manually via button
            // Skip record
         } else {
            var tkRates = _.find(rates, function (arr) { return arr[0].id === item.ttk; }),      // OR $.grep(rates, function (arr) { return arr[0].id == item.ttk; )
            cli = {
               status: item.tbillstatus,
               id: item.ttk,                   // Not displayed
               name: item.tkname,
               lvl: item.tilevel,              // Not displayed
               title: item.tktitle,
               loc: item.loaddr6,
               dep: item.label5,
               //hrsBill: item.tworkhrs,
               hrsBill: (item.tbillstatus === '' ? 0 : item.tworkhrs),       // item.tbillstatus === '' --> Added via "Add Timekeeper(s)" button
               amtBill: item.tbilldol,
               rateBlend: (item.tworkhrs === 0 ? 0 : item.tbilldol / item.tworkhrs),
               hrsProp: item.tworkhrs,
               rateProp: (bReCalc ? item.rateProp : 0),
               calcProp: (bReCalc ? item.calcProp : 0),
               conv1: tkRates[0].conv,         // Not displayed
               conv2: tkRates[1].conv,         // Not displayed
               conv3: tkRates[2].conv,         // Not displayed
               rate1: tkRates[0].rate,
               calc1: tkRates[0].rate * item.tworkhrs,
               rate2: tkRates[1].rate,
               calc2: tkRates[1].rate * item.tworkhrs,
               rate3: tkRates[2].rate,
               calc3: tkRates[2].rate * item.tworkhrs,
            };

            // Multi-year projection
            if (utils.pctDist !== undefined) {
               var alloc = utils.pctDist;                      // % Distribution across years/months

               if (alloc[0].dte.indexOf('/') === -1) {
                  // #region Allocation across years
                  var pctInc = utils.incr / 100,              // Annual % increase
                     currYr = (new Date()).getFullYear(),
                     wtMean1 = 0, wtMean2 = 0, wtMean3 = 0;  // Weighted means

                  for (var i = 1; i <= yrs; i++) {
                     // Model 1:  fvCalc = function (P, r, t)
                     cli['rate1Yr' + i] = utils.fvCalc(cli.rate1, pctInc, alloc[i - 1].dte - currYr);
                     cli['calc1Yr' + i] = utils.round(cli['rate1Yr' + i] * cli.hrsProp * alloc[i - 1].pct, 2);          // utils.round():  Match totals to the exact penny                
                     wtMean1 += cli['rate1Yr' + i] * alloc[i - 1].pct;
                     // Model 2
                     cli['rate2Yr' + i] = utils.fvCalc(cli.rate2, pctInc, alloc[i - 1].dte - currYr);
                     cli['calc2Yr' + i] = utils.round(cli['rate2Yr' + i] * cli.hrsProp * alloc[i - 1].pct, 2);
                     wtMean2 += cli['rate2Yr' + i] * alloc[i - 1].pct;
                     // Model 3
                     cli['rate3Yr' + i] = utils.fvCalc(cli.rate3, pctInc, alloc[i - 1].dte - currYr);
                     cli['calc3Yr' + i] = utils.round(cli['rate3Yr' + i] * cli.hrsProp * alloc[i - 1].pct, 2);
                     wtMean3 += cli['rate3Yr' + i] * alloc[i - 1].pct;
                  }
                  cli.rate1 = wtMean1;
                  cli.calc1 = utils.round(wtMean1 * cli.hrsProp, 2);

                  cli.rate2 = wtMean2;
                  cli.calc2 = utils.round(wtMean2 * cli.hrsProp, 2);

                  cli.rate3 = wtMean3;
                  cli.calc3 = utils.round(wtMean3 * cli.hrsProp, 2);
                  // #endregion
               } else {
                  // #region Allocation across months
                  var allocRt1 = utils.pctMthDist(cli.rate1, cli.hrsProp),
                     allocRt2 = utils.pctMthDist(cli.rate2, cli.hrsProp),
                     allocRt3 = utils.pctMthDist(cli.rate3, cli.hrsProp),
                     cnt = allocRt1.length;

                  for (var n = 1; n <= cnt; n++) {
                     // Model 1:
                     cli['rate1Yr' + n] = parseFloat(allocRt1[n - 1].rate).toFixed(2);
                     cli['calc1Yr' + n] = utils.round(allocRt1[n - 1].calc, 2);
                     // Model 2
                     cli['rate2Yr' + n] = parseFloat(allocRt2[n - 1].rate).toFixed(2);
                     cli['calc2Yr' + n] = utils.round(allocRt2[n - 1].calc, 2);
                     // Model 3
                     cli['rate3Yr' + n] = parseFloat(allocRt3[n - 1].rate).toFixed(2);
                     cli['calc3Yr' + n] = utils.round(allocRt3[n - 1].calc, 2);

                     if (n === cnt) {
                        cli.rate1 = allocRt1[n - 1].rate;
                        cli.calc1 = utils.round(allocRt1[n - 1].calc, 2);

                        cli.rate2 = allocRt2[n - 1].rate;
                        cli.calc2 = utils.round(allocRt2[n - 1].calc, 2);

                        cli.rate3 = allocRt3[n - 1].rate;
                        cli.calc3 = utils.round(allocRt3[n - 1].calc, 2);
                     }
                  }
                  // #endregion
               }
            }
            clients.push(cli);
         }
      });
      // #endregion

      grdTk.destroy();
      //grdTk.wrapper.empty();
      grdTk = $("#grdTk").empty().kendoGrid({
         //#region Archive
         //dataSource: {
         //    transport: {
         //        read: {
         //            url: $.url('api/Modeler/GetTks'),
         //            data: { 'client': cli, 'matter': mat, 'begper': beg, 'endper': end, 'History': his, 'Billed': bil, 'Unbilled': unb },
         //            dataType: 'jsonData'
         //        }
         //    },
         //    schema: {
         //        model: extSchema.model,
         //        parse: function (data) {
         //            var clients = [];
         //            $.each(data, function (idx, item) {
         //                var cli = {
         //                    status: item.tbillstatus,
         //                    id: item.ttk,
         //                    name: item.tkname,
         //                    lvl: item.tilevel,
         //                    title: item.tktitle,
         //                    loc: item.loaddr6,
         //                    dep: item.label5,
         //                    hrsBill: item.tworkhrs,
         //                    amtBill: item.tbilldol,
         //                    rateBlend: (item.tworkhrs == 0 ? 0 : item.tbilldol / item.tworkhrs),
         //                    hrsProp: item.tworkhrs,
         //                    rateProp: 0,
         //                    calcProp: 0,
         //                    rate1: 0,
         //                    calc1: 0,
         //                    rate2: 0,
         //                    calc2: 0,
         //                    rate3: 0,
         //                    calc3: 0,
         //                };
         //                clients.push(cli);
         //            });
         //            console.groupCollapsed("Massaged roster data:");
         //            console.log(JSON.stringify(clients, null, 4));
         //            console.groupEnd();
         //            return clients;
         //        }
         //    },
         //    aggregate: extSchema.aggrs
         //},
         //#endregion
         dataSource: {
            data: clients,
            //schema: { model: extSchema.model },
            schema: { model: { id: "id", fields: fldsClone } },
            aggregate: aggrsClone
         },
         columns: colsClone,
         //editable: true,
         editable: { confirmation: false },
         //height: 210,
         navigatable: true,
         //selectable: 'multiple, row',
         resizable: true,
         pageable: { pageSize: 10 },
         edit: onEditgrdTk,
         save: onSavegrdTk,
         dataBound: onDataBoundgrdTk
      }).data("kendoGrid");
      // Reset grid height
      // $('#grdTk > .k-grid-content').css({ 'height': '175px' });

      if (grdTk.dataSource.total() != 0) disableBtns(false);

      // Must define after data is populated
      grdTk.table.on("click", ".chkbox", selectRow);
   },
   onEditgrdTk = function (e) {
      var fieldname = grdTk.columns[e.container.index()].field,
         editfields = 'hrsProp, rateProp';   // Allowed editable fields
      if (editfields.indexOf(fieldname) === -1) this.closeCell();
   },
   onSavegrdTk = function (e) {
      // http://stackoverflow.com/questions/21159784/subtract-value-of-two-columns-from-to-and-put-the-result-to-a-different-colu
      for (var field in e.values);
      if (field === 'rateProp') {
         e.model.set("calcProp", e.model.hrsProp * e.values.rateProp);
      }
      if (field === 'hrsProp') {
         e.model.set("calcProp", e.values.hrsProp * e.model.rateProp);
         e.model.set("calc1", e.values.hrsProp * e.model.rate1);
         e.model.set("calc2", e.values.hrsProp * e.model.rate2);
         e.model.set("calc3", e.values.hrsProp * e.model.rate3);
         // Multi-year projection
         if (typeof utils.pctDist !== 'undefined') {
            var yrs = utils.yrs;
            for (var i = 1; i <= yrs; i++) {
               e.model.set('calc1Yr' + i, e.values.hrsProp * e.model['rate1Yr' + i]);
               e.model.set('calc2Yr' + i, e.values.hrsProp * e.model['rate2Yr' + i]);
               e.model.set('calc3Yr' + i, e.values.hrsProp * e.model['rate3Yr' + i]);
            }
         }
      }
      this.refresh();
   },
   onDataBoundgrdTk = function () {
      /*
      // Change column headers to match rates selected
      if (rtModels.code1 !== undefined) {
         $('#grdTk th[data-field=rate1]').html('Total Proj ' + rtModels.desc1 + ' Rate ' + rtModels.currSymbol1);
         $('#grdTk th[data-field=calc1]').html('Total Proj ' + rtModels.desc1 + ' Calc ' + rtModels.currSymbol1);
      }
      */
      /*
      // http://blog.falafel.com/displaying-message-kendo-ui-grid-empty/
      // http://sympletech.com/adding-no-results-found-to-the-kendoui-grid/
      //Get the number of Columns in the grid
      //var colCount = $("#kGrid").find('.k-grid-header colgroup > col').length;
      //If There are no results place an indicator row
      if (this.dataSource.total() === 0) {
         $("#grdTk").find('.k-grid-content tbody')
            .append('<tr class="kendo-data-row"><td colspan="0" style="text-align:center"><b>No timekeeper roster available at this time</b></td></tr>');
      }
      */
      /*
      //Get visible row count
      var rowCount = $("#kGrid").find('.k-grid-content tbody tr').length;
      //If the row count is less that the page size add in the number of missing rows
      if (rowCount < dsTk._take) {
         var addRows = dsTk._take -rowCount;
         for (var i = 0; i < addRows; i++) {
            $("#grdTk").find('.k-grid-content tbody')
                  .append('<tr class="kendo-data-row"><td>&nbsp;</td></tr>');
         }
      }
      */

      var per = $('input:radio[name=rbPeriod]:checked').val(),
         beg = kendo.toString(fromPicker.value(), "MMyy"),
         end = kendo.toString(toPicker.value(), "MMyy"),
         bil = $("#chkBilled").is(":checked"),
         unb = $("#chkUnbilled").is(":checked"),
         tot = this.dataSource.total();

      saveParms(per, beg, end, bil, unb, tot);
      kendo.ui.progress($("#divTk"), false);
   };

   function Element(text, value) {
      this.text = text;
      this.value = value;
   };

   function populateRateDDLs() {
      //kendo.ui.progress($("#divMain"), true);
      $.ajax({
         //url: '@Url.Action("GetRates", "Pages", null, "http")',
         //url: $.url('Pages/GetRates'),
         //type: 'POST',
         url: $.url('api/Modeler/GetRates'),
         dataType: 'jsonData',
         success: function (data) {
            if (JSON.stringify(data) != "[]") {
               var rtGrp = -123,
                   rtData = [];     //new Array(new Element('', ''));
               data.forEach(function (val) {
                  if (val.rtRateGroup != rtGrp) {
                     rtData.push(new Element(val.rtRateGroupDesc.trim(), val.rtRateGroup));     // Group header
                     rtGrp = val.rtRateGroup;
                  }
                  rtData.push(new Element(val.rtDesc.trim(), val.rtCurr.trim() + '|' + val.rtCode + '|' + val.rtCurrSymbol.trim() + '|' + val.rtDesc.trim()));
               });

               ddl1 = $('#ddlModel1').kendoDropDownList({
                  dataTextField: "text",
                  dataValueField: "value",
                  dataSource: rtData,
                  template: kendo.template($("#tmplRate").html()),
                  //dataBound: function (e) {
                  //   e.sender.dataSource.transport.data.unshift({ text: '062', value: 'Total' });
                  //},
                  optionLabel: "Select rate model 1",
                  select: NoHeaders
               }).data("kendoDropDownList");
               ddl1.list.width(275);
               ddl2 = $('#ddlModel2').kendoDropDownList({
                  dataTextField: "text",
                  dataValueField: "value",
                  dataSource: rtData,
                  template: kendo.template($("#tmplRate").html()),
                  optionLabel: "Select rate model 2",
                  select: NoHeaders
               }).data("kendoDropDownList");
               ddl2.list.width(275);
               ddl3 = $('#ddlModel3').kendoDropDownList({
                  dataTextField: "text",
                  dataValueField: "value",
                  dataSource: rtData,
                  template: kendo.template($("#tmplRate").html()),
                  optionLabel: "Select rate model 3",
                  select: NoHeaders
                  //}).data("kendoDropDownList").list.width("auto");
               }).data("kendoDropDownList");
               ddl3.list.width(275);

               resetRates();
               enableRates(false, false);
            }
         },
         error: function (xhr, status, err) {
            toastr.error('GetRates', err);
         },
         complete: function () {
            //kendo.ui.progress($("#divMain"), false);
         }
      });
   };

   function isParmsClean(per, beg, end, bil, unb, tot) {
      return (globalStore.per == per && globalStore.beg == beg && globalStore.end == end
         && globalStore.bil == bil && globalStore.unb == unb && tot != 0);
   }

   function saveParms(per, beg, end, bil, unb, tot) {
      globalStore.per = per;
      globalStore.beg = beg;
      globalStore.end = end;
      globalStore.bil = bil;
      globalStore.unb = unb;
      globalStore.tot = tot;
   }

   function enablePeriods(flg) {
      if (flg) {
         $('#divPeriod').prop('disabled', !flg);
         //fromPicker.enable(flg);
         //toPicker.enable(flg);
         $('#chkBilled').prop('checked', flg);
      } else {
         $('#divPeriod').prop('disabled', !flg);
         $('input:radio[name=rbPeriod][value=Year]').prop('checked', !flg);
         fromPicker.value(null);
         toPicker.value(null);
         fromPicker.enable(flg);
         toPicker.enable(flg);
         $('#chkBilled').prop('checked', flg);
         $('#chkUnbilled').prop('checked', flg);
      }
   };

   function enableRates(flg1, flg2) {
      ddl1.enable(flg1);
      ddl2.enable(flg1);
      ddl3.enable(flg1);
      $('#btnPull').prop('disabled', !flg2);
   };

   function resetRates() {
      ddl1.select(0);
      ddl2.select(0);
      ddl3.select(0);
   };

   function disableBtns(flag) {
      $('#btnDel').prop('disabled', flag);
      $('#btnAdd').prop('disabled', flag);
      $('#btnPrj').prop('disabled', flag);
      $('#btnExl').prop('disabled', flag);
   };

   // #endregion    
});