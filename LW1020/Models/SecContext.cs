using System;
using System.Data.Entity;
using System.Linq;

namespace LW1020.Models
{
   public class SecContext : DbContext
   {
      static SecContext()
      {
         Database.SetInitializer<SecContext>(null);
      }

      public SecContext()
         : base("Name=" + Global.CONN_STR_NAME_ADSI)
      {

      }

      public bool isAuthorized(string ntid)
      {
         string sSQL = "SELECT TOP 1 g.nt_id " +
                       "FROM	 tblSecGroups g " +
                       "JOIN	 ERStblSecurity e  ON g.group_name = e.ers_group_name " +
                       "WHERE  e.ers_reportID = 'LW1020' " +
                       "AND	 g.nt_id = '" + ntid + "' ";
         string sAccess = this.Database.SqlQuery<string>(sSQL).SingleOrDefault();

         return !String.IsNullOrEmpty(sAccess);
      }

   }
}