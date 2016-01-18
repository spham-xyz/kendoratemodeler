using Aspose.Cells;
using Kendo.Mvc.Extensions;         //.ToDataSourceResult         
using Kendo.Mvc.UI;
using LW1020.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;                  // Dictionary.Keys | .Values.ElementAt()
using System.Text.RegularExpressions;
using System.Web.Mvc;

namespace LW1020.Controllers
{
   public class PagesController : Controller
   {
      public ActionResult Index()
      {
         return View();
      }
      public ActionResult Main(string spooferID)
      {
         string ntID = GetID();

         if (spooferID == null && IsSpoofer())
         {
            ViewBag.IsSpoofer = true;
            return View("Spoofing");
         }
         else
         {
            ntID = spooferID ?? ntID;

            if (IsAuthorized(ntID))
            {
               LogUserInfo();
               return View();
            }
            else
            {
               return View("NotAuthorized");
            }
         }
      }
      public ActionResult NotAuthorized()
      {
         return View();
      }
      public ActionResult Spoofing()
      {
         ViewBag.IsSpoofer = IsSpoofer();
         return View();
      }

      public ActionResult PopUpClients()
      {
         return PartialView("_clientSearch");
      }
      public ActionResult PopUpMatter()
      {
         return PartialView("_buildMatter");
      }
      public ActionResult AddTks()
      {
         return PartialView("_addTks");
      }
      public ActionResult MultiYrProj()
      {
         return PartialView("_multiYrProj");
      }

      public ActionResult GenerateExcel([DataSourceRequest]DataSourceRequest request, string colsDef, string gridData,
                     string client, string matter, string currency, string rateGrp, string start, string duration)
      {
         // A column dataType based on the first record in the result set.
         //DataTable dt = (DataTable)JsonConvert.DeserializeObject(gridData, (typeof(DataTable)));
         var dtData = JsonConvert.DeserializeObject<DataTable>(gridData);
         /*
         var dtData = JsonConvert.DeserializeObject<DataTable>(gridData, new JsonSerializerSettings {
            // http://stackoverflow.com/questions/26484176/jobject-parse-modifies-end-of-floating-point-values
            FloatParseHandling = FloatParseHandling.Decimal,
            NullValueHandling = NullValueHandling.Ignore,
            MissingMemberHandling = MissingMemberHandling.Ignore,
            Formatting = Formatting.None,
            DateFormatHandling = DateFormatHandling.IsoDateFormat,
            Converters = new List<JsonConverter> { new DecimalConverter() }
         });
         */
         var dtCols = JsonConvert.DeserializeObject<DataTable>(colsDef);
         Dictionary<string, string> dicCols = new Dictionary<string, string>();

         #region Need to get dtData to match dtCols:  Columns order & title
         foreach (DataRow dr in dtCols.Rows)
            dicCols.Add((string)dr["field"], (string)dr["title"]);

         dtData.SetColumns(dicCols);

         // Remove extraneous columns
         int cnt = dtData.Columns.Count;
         for (int j = dtCols.Rows.Count; j < cnt; cnt--)
         {
            dtData.Columns.RemoveAt(j);
         }
         #endregion

         //Create a new worksheet
         var license = new Aspose.Cells.License();
         license.SetLicense("Aspose.Total.lic");
         var workbook = new Workbook();
         var worksheet = workbook.Worksheets[0];
         var cells = worksheet.Cells;

         //Import data
         int firstRow = 9;       // zero-based
         cells.ImportDataTable(dtData, true, firstRow, 0);

         TimeZoneInfo localZone = TimeZoneInfo.Local;
         string sRunDate = String.Format("{0:MM/dd/yyyy hh:mm tt}", DateTime.Now) +
                  " (" + ((localZone.IsDaylightSavingTime(DateTime.Now)) ? localZone.DaylightName : localZone.StandardName) + ")";
         cells["A1"].PutValue("Report:  LW1020 Rate Modeler");
         cells["A2"].PutValue("Run Date:  " + sRunDate);
         cells["A3"].PutValue(client);
         cells["A4"].PutValue(matter);
         cells["A5"].PutValue(currency);
         cells["A6"].PutValue(rateGrp);
         cells["A7"].PutValue(start);
         cells["A8"].PutValue(duration);

         Style stl1 = workbook.Styles[workbook.Styles.Add()];
         stl1.Custom = "#,##0.00";
         StyleFlag flg1 = new StyleFlag();
         flg1.NumberFormat = true;

         Style stl2 = workbook.Styles[workbook.Styles.Add()];
         stl2.HorizontalAlignment = TextAlignmentType.Center;
         stl2.Font.Color = Color.Blue;
         stl2.Font.IsBold = true;
         stl2.Font.Name = "Arial";
         stl2.Font.Size = 10;
         StyleFlag flgTit = new StyleFlag();
         flgTit.Font = true;
         StyleFlag flgHdr = new StyleFlag();
         flgHdr.Font = true;
         flgHdr.HorizontalAlignment = true;

         Range rngTit = cells.CreateRange("A1", "A8");
         Range rngHdr = cells.CreateRange("A10", "BB10");
         rngTit.ApplyStyle(stl2, flgTit);
         rngHdr.ApplyStyle(stl2, flgHdr);

         #region *** Set up subtotal formulas ***
         string xlCol = string.Empty;
         int firstDataRow = firstRow + 2;
         int lastDataRow = firstDataRow + dtData.Rows.Count - 1;
         int subRow = lastDataRow + 2;

         for (int i = 6; i <= dtData.Columns.Count; i++)
         {
            xlCol = GetExcelColumnName(i);
            switch (i)
            {
               case 6:  // Hours Billed
                  cells[xlCol + subRow].Formula = "sum(" + xlCol + firstDataRow + ":" + xlCol + lastDataRow + ")";
                  break;
               default: // Amount Billed $,Prop Hours,Prop Calc,Total Proj Calc 1,...
                  if (i % 2 == 1) cells[xlCol + subRow].Formula = "sum(" + xlCol + firstDataRow + ":" + xlCol + lastDataRow + ")";
                  break;
            }
         }
         #endregion

         //Format the columns
         worksheet.AutoFitColumns();
         for (int i = 0; i < dtData.Columns.Count; i++)
         {
            switch (i)
            {
               case 0:
                  cells.SetColumnWidth(i, 14);
                  break;
               case 1:
               case 2:
               case 3:
               case 4:
                  // Do nothing
                  break;
               default:
                  cells.Columns[i].ApplyStyle(stl1, flg1);
                  break;
            }
         }

         //Save file
         worksheet.Name = Global.REPORT_ID;
         string fileName = Global.REPORT_ID + "_" + String.Format("{0:MM_dd_yyyy_hh_mm_ss_tt}", DateTime.Now) + ".xlsx";

         // http://www.aspose.com/docs/display/cellsnet/Saving+Files
         var ms = new MemoryStream();
         workbook.Save(ms, SaveFormat.Xlsx);

         ms.Position = 0;
         Session[fileName] = ms;
         return Json(new { fileName }, JsonRequestBehavior.AllowGet);
      }

      public ActionResult DownloadExcel(string fName)
      {
         var ms = Session[fName] as MemoryStream;
         if (ms == null)
            return new EmptyResult();
         Session[fName] = null;
         return File(ms, "application/vnd.ms-excel", fName);
      }

      // http://stackoverflow.com/questions/181596/how-to-convert-a-column-number-eg-127-into-an-excel-column-eg-aa
      private string GetExcelColumnName(int columnNumber)
      {
         int dividend = columnNumber;
         string columnName = String.Empty;
         int modulo;

         while (dividend > 0)
         {
            modulo = (dividend - 1) % 26;
            columnName = Convert.ToChar(65 + modulo).ToString() + columnName;
            dividend = (int)((dividend - modulo) / 26);
         }

         return columnName;
      }

      [HttpPost]
      public void LogUserInfo()
      {
         using (var ctx = new ModelerContext())
         {
            ctx.logUserInfo(GetID(), Global.REPORT_ID);
         }
      }

      public bool IsSpoofer()
      {
         string ntID = GetID();
         string spoofers = ConfigurationManager.AppSettings["SpoofingIDs"].ToString().Trim();

         if (Regex.IsMatch(spoofers, string.Format(@"(\b{0}\b)", ntID), RegexOptions.IgnoreCase))
            return true;
         else
            return false;
      }

      public bool IsAuthorized(string ntID)
      {
         using (var ctx = new SecContext())
            return ctx.isAuthorized(ntID);
      }

      private string GetID()
      {
         string pattern = @"^\w*\\";
         string input = System.Web.HttpContext.Current.User.Identity.Name;
         Regex rgx = new Regex(pattern);
         return rgx.Replace(input, string.Empty).ToUpper();
      }
   }


   public static class MyExtensions
   {
      public static void SetColumnsOrder(this DataTable table, params String[] columnNames)
      {
         for (int columnIndex = 0; columnIndex < columnNames.Length; columnIndex++)
         {
            table.Columns[columnNames[columnIndex]].SetOrdinal(columnIndex);
         }
      }
      public static void SetColumns(this DataTable table, Dictionary<string, string> dicCols)
      {
         string key, val;
         int k = 0;
         for (int i = 0; i < dicCols.Count; i++)
         {
            key = dicCols.Keys.ElementAt(i);
            val = dicCols.Values.ElementAt(i);
            table.Columns[key].SetOrdinal(i);
            // Cannot have duplicate column names in the datatable; add space(s) to duplicates
            // Issue occurs when duplicate rate models are selected
            // rate2Yr1..6, calc2Yr1..6, rate2/calc2
            // rate3Yr1..6, calc3Yr1..6, rate3/calc3
            if (table.Columns.Contains(val) && (key.StartsWith("rate") || key.StartsWith("calc")))
            {
               k = Convert.ToInt32(key.Substring(4, 1)) - 1;
               table.Columns[key].ColumnName = val + (new String(' ', k));
            }
            else
               table.Columns[key].ColumnName = val;
         }
      }
      /// <summary>
      /// Generates a fully qualified URL to an action method by using
      /// the specified action name, controller name and route values.
      /// </summary>
      /// <param name="url">The URL helper.</param>
      /// <param name="actionName">The name of the action method.</param>
      /// <param name="controllerName">The name of the controller.</param>
      /// <param name="routeValues">The route values.</param>
      /// <returns>The absolute URL.</returns>
      // https://blog.mariusschulz.com/2011/06/30/how-to-build-absolute-action-urls-using-the-urlhelper-class
      public static string AbsoluteAction(this UrlHelper url,
          string actionName, string controllerName, object routeValues = null)
      {
         string scheme = url.RequestContext.HttpContext.Request.Url.Scheme;
         return url.Action(actionName, controllerName, routeValues, scheme);
      }

   }

   // http://stackoverflow.com/questions/24051206/handling-decimal-values-in-newtonsoft-json
   class DecimalConverter : JsonConverter
   {
      public override bool CanConvert(Type objectType)
      {
         return (objectType == typeof(int) || objectType == typeof(decimal) || objectType == typeof(decimal?));
         //return (objectType == typeof(DataTable));
      }

      public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
      {
         JToken token = JToken.Load(reader);
         if (token.Type == JTokenType.Integer || token.Type == JTokenType.Float)
         {
            return token.ToObject<decimal>();
         }
         if (token.Type == JTokenType.String)
         {
            // customize this to suit your needs
            return Decimal.Parse(token.ToString(),
                   System.Globalization.CultureInfo.GetCultureInfo("en-US"));
         }
         if (token.Type == JTokenType.Null && objectType == typeof(decimal?))
         {
            return null;
         }
         throw new JsonSerializationException("Unexpected token type: " + token.Type.ToString());
      }

      public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
      {
         throw new NotImplementedException();
      }
   }

}
