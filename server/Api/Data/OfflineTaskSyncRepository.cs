using System;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;
using System.Xml.Linq;
using DAR.OfflineSync.Api.Models;
using Microsoft.Extensions.Configuration;

namespace DAR.OfflineSync.Api.Data
{
    public interface IOfflineTaskSyncRepository
    {
        Task<SyncResult> SyncAsync(SyncPayload payload, string syncBy);
    }

    /// <summary>
    /// Thin ADO.NET wrapper over DAR.usp_SyncOfflineTaskAssignment.
    ///
    /// The client posts JSON, but SQL Server 2012 has no JSON support, so the payload
    /// is re-serialized to XML here and passed as a typed XML parameter. The stored
    /// proc owns every bit of validation / upsert / sync-stamp logic.
    /// </summary>
    public class OfflineTaskSyncRepository : IOfflineTaskSyncRepository
    {
        private readonly string _connectionString;

        public OfflineTaskSyncRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DARDatabase");
        }

        public async Task<SyncResult> SyncAsync(SyncPayload payload, string syncBy)
        {
            var xml = BuildXml(payload).ToString(SaveOptions.DisableFormatting);
            var result = new SyncResult();

            using (var conn = new SqlConnection(_connectionString))
            using (var cmd = new SqlCommand("DAR.usp_SyncOfflineTaskAssignment", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.Add(new SqlParameter("@Xml", SqlDbType.Xml) { Value = xml });
                cmd.Parameters.Add(new SqlParameter("@SyncBy", SqlDbType.VarChar, 40)
                {
                    Value = (object)syncBy ?? DBNull.Value
                });

                var pReturn = new SqlParameter("@ReturnCode", SqlDbType.Int) { Direction = ParameterDirection.Output };
                var pMessage = new SqlParameter("@Message", SqlDbType.NVarChar, 4000) { Direction = ParameterDirection.Output };
                cmd.Parameters.Add(pReturn);
                cmd.Parameters.Add(pMessage);

                await conn.OpenAsync();

                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    // The proc returns either the success summary OR the error list.
                    // Detect the shape by column presence so one loop handles both.
                    bool isErrorShape = HasColumn(reader, "Scope");

                    while (await reader.ReadAsync())
                    {
                        if (isErrorShape)
                        {
                            result.Errors.Add(new SyncError
                            {
                                ErrNo = GetInt(reader, "ErrNo"),
                                Code = GetString(reader, "Code"),
                                Scope = GetString(reader, "Scope"),
                                Field = GetString(reader, "Field"),
                                Message = GetString(reader, "Message")
                            });
                        }
                        else
                        {
                            result.Synced.Add(new SyncedSummary
                            {
                                Code = GetString(reader, "Code"),
                                PhaseCode = GetString(reader, "PhaseCode"),
                                AdminWorker = GetString(reader, "AdminWorker"),
                                DateTimeIn = GetString(reader, "DateTimeIn"),
                                LineCount = GetInt(reader, "LineCount"),
                                SyncDate = GetString(reader, "SyncDate"),
                                SyncBy = GetString(reader, "SyncBy")
                            });
                        }
                    }
                }

                result.ReturnCode = pReturn.Value == DBNull.Value ? 2 : (int)pReturn.Value;
                result.Message = pMessage.Value == DBNull.Value ? null : (string)pMessage.Value;
                result.Success = result.ReturnCode == 0;
            }

            return result;
        }

        /// <summary>
        /// Builds the XML payload consumed by the stored proc. Null values are
        /// omitted so the proc reads them as NULL (see .nodes()/.value() shredding).
        /// </summary>
        private static XElement BuildXml(SyncPayload payload)
        {
            var summaries = new XElement("summaries",
                payload.Summaries.Select(s =>
                    new XElement("summary",
                        El("adminWorker", s.AdminWorker),
                        El("adminSystem", s.AdminSystem),
                        El("adminId", s.AdminId),
                        El("hrisSystem", s.HrisSystem),
                        El("noahSystem", s.NoahSystem),
                        El("phaseCode", s.PhaseCode),
                        El("dateTimeIn", s.DateTimeIn),
                        El("status", s.Status),
                        El("isActive", s.IsActive),
                        El("recUser", s.RecUser),
                        new XElement("lines",
                            (s.Lines ?? Enumerable.Empty<TaskAssignmentLine>()).Select(l =>
                                new XElement("line",
                                    El("category", l.Category),
                                    El("blk", l.Blk),
                                    El("lot", l.Lot),
                                    El("taskCode", l.TaskCode),
                                    El("taskDescription", l.TaskDescription),
                                    El("dateTimeIn", l.DateTimeIn),
                                    El("dateTimeOut", l.DateTimeOut),
                                    El("isOT", l.IsOT),
                                    El("otBatchID", l.OtBatchID),
                                    El("otCategory", l.OtCategory),
                                    El("otTargetIn", l.OtTargetIn),
                                    El("otTargetOut", l.OtTargetOut),
                                    El("isActive", l.IsActive),
                                    El("recUser", l.RecUser),
                                    El("isNew", l.IsNew),
                                    El("isEnd", l.IsEnd),
                                    El("projectedTimeOut", l.ProjectedTimeOut),
                                    El("justificationForOt", l.JustificationForOt),
                                    El("uploadedCode", l.UploadedCode)
                                )
                            )
                        )
                    )
                )
            );

            return new XElement("sync",
                El("syncBy", payload.SyncBy),
                El("recUser", payload.RecUser),
                summaries
            );
        }

        /// <summary>Returns an element only when the value is present; otherwise null (skipped).</summary>
        private static XElement El(string name, object value)
        {
            if (value == null) return null;
            if (value is string s && string.IsNullOrEmpty(s)) return null;
            return new XElement(name, value);
        }

        private static bool HasColumn(IDataRecord reader, string name)
        {
            for (int i = 0; i < reader.FieldCount; i++)
                if (string.Equals(reader.GetName(i), name, StringComparison.OrdinalIgnoreCase))
                    return true;
            return false;
        }

        private static string GetString(IDataRecord r, string col)
        {
            int i = r.GetOrdinal(col);
            return r.IsDBNull(i) ? null : Convert.ToString(r.GetValue(i));
        }

        private static int GetInt(IDataRecord r, string col)
        {
            int i = r.GetOrdinal(col);
            return r.IsDBNull(i) ? 0 : Convert.ToInt32(r.GetValue(i));
        }
    }
}
