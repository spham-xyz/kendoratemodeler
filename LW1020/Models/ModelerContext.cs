using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;

namespace LW1020.Models
{
   public partial class ModelerContext : DbContext
   {
      static ModelerContext()
      {
         Database.SetInitializer<ModelerContext>(null);
      }
      public ModelerContext()
         : base("Name=" + Global.CONN_STR_NAME_RPT)
      {
         #if DEBUG
         // View Generated SQL in output window
         this.Database.Log = s => Debug.WriteLine(s);      // EF6
         #endif
      }
      public List<ClientVM> getClients(string ClientId, string ClientName, string ClientDpt, string MatterId, string MatterName, int Soundex)
      {
         return this.Database.SqlQuery<ClientVM>("EXEC sp_RateClientList @ClientId, @ClientName, @ClientDpt, @MatterId, @MatterName, @Soundex",
                                                         new SqlParameter("@ClientId", ClientId),
                                                         new SqlParameter("@ClientName", ClientName),
                                                         new SqlParameter("@ClientDpt", ClientDpt),
                                                         new SqlParameter("@MatterId", MatterId),
                                                         new SqlParameter("@MatterName", MatterName),
                                                         new SqlParameter("@Soundex", Soundex)).ToList();
      }
      public String getRateGrpDesc(string matNum)
      {
         return this.Database.SqlQuery<String>("EXEC sp_RateGroupDesc @MatterNum", new SqlParameter("@MatterNum", matNum)).FirstOrDefault();
      }
      public List<RateVM> getRates()
      {
         return this.Database.SqlQuery<RateVM>("EXEC sp_RateRatesList @Currency", new SqlParameter("@Currency", "")).ToList();
      }
      public List<TkVM> getTks(string client, string matter, string begper, string endper, string History, string Billed, string Unbilled)
      {
         return this.Database.SqlQuery<TkVM>("EXEC sp_RateTimekeeperRoster @client, @matter, @begper, @endper, @History, @Billed, @Unbilled",
                                                      new SqlParameter("@client", client),
                                                      new SqlParameter("@matter", matter),
                                                      new SqlParameter("@begper", begper),
                                                      new SqlParameter("@endper", endper),
                                                      new SqlParameter("@History", History),
                                                      new SqlParameter("@Billed", Billed),
                                                      new SqlParameter("@Unbilled", Unbilled)).ToList();
      }
      public List<ListRateVM> getRateList(short code, string curr)
      {
         return this.Database.SqlQuery<ListRateVM>("EXEC sp_RateList @Code, @Curr",
                                                      new SqlParameter("@Code", code),
                                                      new SqlParameter("@Curr", curr)).ToList();
      }
      public List<ListTimeRateVM> getTimeRateList(string id, string curr)
      {
         return this.Database.SqlQuery<ListTimeRateVM>("EXEC sp_RateTimerateList @currency, @id",
                                                      new SqlParameter("@currency", curr),
                                                      new SqlParameter("@id", id)).ToList();
      }
      public int verifyPeriod(string from, string to)
      {
         return this.Database.SqlQuery<int>("EXEC sp_RatePeriodVerify @BegPer, @EndPer",
                           new SqlParameter("@BegPer", from),
                           new SqlParameter("@EndPer", to)).FirstOrDefault();
      }
      public List<LocVM> getLocations()
      {
         return this.Database.SqlQuery<LocVM>("EXEC sp_RateOfficeList").ToList();
      }
      public List<TitVM> getTitles()
      {
         return this.Database.SqlQuery<TitVM>("EXEC sp_RateTitleList").ToList();
      }  
      public List<RateTkVM> getRateTks(string locs, string titles)
      {
         return this.Database.SqlQuery<RateTkVM>("EXEC sp_RateTks @locs, @titles",
                                             new SqlParameter("@locs", locs),
                                             new SqlParameter("@titles", titles)).ToList();
      }
      public List<CurrCodesVM> getCurrCodes()
      {
         return this.Database.SqlQuery<CurrCodesVM>("EXEC sp_RateCurrencyCodes").ToList();
      }

      public void logUserInfo(string usrId, string rptId)
      {
         this.Database.ExecuteSqlCommand("EXEC dbo.uspReportHistory_INSERT_UserInformation @UserNetID, @ReportID",
                              new SqlParameter("@UserNetID", usrId),
                              new SqlParameter("@ReportID", rptId));
      }

   }

}