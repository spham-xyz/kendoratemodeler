using Kendo.Mvc.Extensions;            //.ToDataSourceResult
using Kendo.Mvc.UI;                    //DataSourceResult
using LW1020.Models;
using System.Collections.Generic;
using System.Configuration;
using System.Text.RegularExpressions;    //ModelBinder
using System.Web.Http;
using System.Web.Http.ModelBinding;

namespace LW1020.Controllers
{
   public class ModelerController : ApiController
   {
      //[ActionName("ShowClients")]
      public DataSourceResult GetClients([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request,
         string ClientId, string ClientName, string ClientDpt, string MatterId, string MatterName, int Soundex)
      {
         // *** Web API quirk: Empty string parameters are converted to null values ***
         ClientId = ClientId ?? "";
         ClientName = ClientName ?? "";
         ClientDpt = ClientDpt ?? "";
         MatterId = MatterId ?? "";
         MatterName = MatterName ?? "";

         using (var ctx = new ModelerContext())
         {
            IEnumerable<ClientVM> clients = ctx.getClients(ClientId, ClientName, ClientDpt, MatterId, MatterName, Soundex);
            return clients.ToDataSourceResult(request);
         }
      }
      public string GetRateGrpDesc([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request, string MatterId)
      {
         MatterId = MatterId ?? "";
         using (var ctx = new ModelerContext())
         {
            return ctx.getRateGrpDesc(MatterId);
         }
      }
      public DataSourceResult GetTks([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request,
         string client, string matter, string begper, string endper, string History, string Billed, string Unbilled)
      {
         client = client ?? "";
         matter = matter ?? "";
         begper = begper ?? "";
         endper = endper ?? "";
         History = History ?? "";
         Billed = Billed ?? "";
         Unbilled = Unbilled ?? "";
         using (var ctx = new ModelerContext())
         {
            IEnumerable<TkVM> clients = ctx.getTks(client, matter, begper, endper, History, Billed, Unbilled);
            return clients.ToDataSourceResult(request);
         }
      }
      public DataSourceResult GetRates([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request)
      {
         using (var ctx = new ModelerContext())
         {
            IEnumerable<RateVM> clients = ctx.getRates();
            return clients.ToDataSourceResult(request);
         }
      }
      public DataSourceResult GetRateList([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request, short code, string curr)
      {
         curr = curr ?? "";
         using (var ctx = new ModelerContext())
         {
            IEnumerable<ListRateVM> rates = ctx.getRateList(code, curr);
            return rates.ToDataSourceResult(request);
         }
      }
      public DataSourceResult GetTimeRateList([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request, string id, string curr)
      {
         id = id ?? "";
         curr = curr ?? "";
         using (var ctx = new ModelerContext())
         {
            IEnumerable<ListTimeRateVM> rates = ctx.getTimeRateList(id, curr);
            return rates.ToDataSourceResult(request);
         }
      }

      [HttpGet]
      public int CheckPeriod([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request, string from, string to)
      {
         from = from ?? "";
         to = to ?? "";
         using (var ctx = new ModelerContext())
         {
            return ctx.verifyPeriod(from, to);
         }
      }
      public DataSourceResult GetLocations([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request)
      {
         using (var ctx = new ModelerContext())
         {
            IEnumerable<LocVM> locs = ctx.getLocations();
            return locs.ToDataSourceResult(request);
         }
      }
      public DataSourceResult GetTitles([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request)
      {
         using (var ctx = new ModelerContext())
         {
            IEnumerable<TitVM> titles = ctx.getTitles();
            return titles.ToDataSourceResult(request);
         }
      }
      public DataSourceResult GetRateTks([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request, string locs, string titles)
      {
         locs = locs ?? "";
         titles = titles ?? "";
         using (var ctx = new ModelerContext())
         {
            IEnumerable<RateTkVM> tks = ctx.getRateTks(locs, titles);
            return tks.ToDataSourceResult(request);
         }
      }
      public DataSourceResult GetCurrCodes([ModelBinder(typeof(WebApiDataSourceRequestModelBinder))]DataSourceRequest request)
      {
         using (var ctx = new ModelerContext())
         {
            IEnumerable<CurrCodesVM> cur = ctx.getCurrCodes();
            return cur.ToDataSourceResult(request);
         }
      }

   }
}
