using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace LW1020
{
   // Note: For instructions on enabling IIS6 or IIS7 classic mode, 
   // visit http://go.microsoft.com/?LinkId=9394801

   public class Global : System.Web.HttpApplication
   {
      // constants database connection string names
      public const string CONN_STR_NAME_RPT = "ConnectionString_Data";
      public const string CONN_STR_NAME_ADSI = "ConnectionString_Sec";

      public const string REPORT_ID = "LW1020";
      public static void RegisterGlobalFilters(GlobalFilterCollection filters)
      {
         filters.Add(new HandleErrorAttribute());
      }

      public static void RegisterRoutes(RouteCollection routes)
      {
         routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

         routes.MapHttpRoute(
             name: "DefaultApi",
             //routeTemplate: "api/{controller}/{id}",
             routeTemplate: "api/{controller}/{action}/{id}",
             defaults: new { id = RouteParameter.Optional }
         );

         routes.MapRoute(
             name: "Default",
             url: "{controller}/{action}/{id}",
             defaults: new { controller = "Pages", action = "Main", id = UrlParameter.Optional }
         );

         /*
         // Write JSON property names with camel casing
         // http://www.asp.net/web-api/overview/formats-and-model-binding/json-and-xml-serialization
         var json = GlobalConfiguration.Configuration.Formatters.JsonFormatter;
         json.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
         */
      }

      public static void RegisterBundles(BundleCollection bundles)
      {
         bundles.Add(new StyleBundle("~/Content/kendo/2014.2.716/css").Include(
            "~/Content/kendo/2014.2.716/kendo.common.min.css",
            "~/Content/kendo/2014.2.716/kendo.blueopal.min.css",
            //"~/Content/kendo/2014.2.716/kendo.dataviz.min.css",
            //"~/Content/kendo/2014.2.716/kendo.dataviz.default.min.css",
            "~/Content/toastr.min.css",
            //"~/Content/bootstrap.min.css",
            "~/Content/Site.css"
         ));

         bundles.Add(new ScriptBundle("~/bundles/kendo").Include(
            "~/Scripts/kendo/2014.2.716/jquery.min.js",
            "~/Scripts/kendo/2014.2.716/kendo.all.min.js",
            "~/Scripts/kendo/2014.2.716/kendo.aspnetmvc.min.js",
            "~/Scripts/kendo.modernizr.custom.js",
            "~/Scripts/toastr.min.js",
            //"~/Scripts/bootstrap.min.js",
            //"~/Scripts/require.js",
            "~/Scripts/underscore.min.js",
            "~/Scripts/moment.min.js"
         ));

         bundles.IgnoreList.Clear();
      }

      protected void Application_Start()
      {
         AreaRegistration.RegisterAllAreas();

         RegisterGlobalFilters(GlobalFilters.Filters);
         RegisterRoutes(RouteTable.Routes);

         RegisterBundles(BundleTable.Bundles);
         BundleTable.EnableOptimizations = true;
      }
   }
}