using System.Collections.Generic;

namespace DAR.OfflineSync.Api.Models
{
    /// <summary>
    /// Root payload posted by the offline TaskEntryForm.
    /// Mirrors server/samples/sync-payload.sample.json.
    /// </summary>
    public class SyncPayload
    {
        public string SyncBy { get; set; }
        public string RecUser { get; set; }
        public List<TaskAssignmentSummary> Summaries { get; set; } = new List<TaskAssignmentSummary>();
    }

    /// <summary>
    /// Maps to DAR.OfflineTaskAssignmentSummaryHDR (one per admin/worker per day).
    /// Note: Code is NOT sent by the client — the stored proc generates it from
    /// NoahSystem + PhaseCode + AdminSystem + AdminId + DateTimeIn.
    /// </summary>
    public class TaskAssignmentSummary
    {
        public string AdminWorker { get; set; }
        public string AdminSystem { get; set; }   // e.g. "HRIS" | "NOAH" | "MANUAL"
        public string AdminId { get; set; }
        public string HrisSystem { get; set; }
        public string NoahSystem { get; set; }
        public string PhaseCode { get; set; }
        public string DateTimeIn { get; set; }   // yyyy-MM-dd
        public int? Status { get; set; }
        public int? IsActive { get; set; }
        public string RecUser { get; set; }
        public List<TaskAssignmentLine> Lines { get; set; } = new List<TaskAssignmentLine>();
    }

    /// <summary>Maps to DAR.OfflineTaskAssignmentSummaryLIN (one per planned activity cell).</summary>
    public class TaskAssignmentLine
    {
        public string Category { get; set; }
        public string Blk { get; set; }
        public string Lot { get; set; }
        public string TaskCode { get; set; }
        public string TaskDescription { get; set; }
        public string DateTimeIn { get; set; }    // HH:mm
        public string DateTimeOut { get; set; }   // HH:mm
        public int? IsOT { get; set; }
        public string OtBatchID { get; set; }
        public string OtCategory { get; set; }
        public string OtTargetIn { get; set; }
        public string OtTargetOut { get; set; }
        public int? IsActive { get; set; }
        public string RecUser { get; set; }
        public int? IsNew { get; set; }
        public int? IsEnd { get; set; }
        public string ProjectedTimeOut { get; set; }
        public string JustificationForOt { get; set; }
        public string UploadedCode { get; set; }
    }

    /// <summary>Uniform API envelope returned to the client.</summary>
    public class SyncResult
    {
        public bool Success { get; set; }
        public int ReturnCode { get; set; }          // 0 ok, 1 validation, 2 server error
        public string Message { get; set; }
        public List<SyncedSummary> Synced { get; set; } = new List<SyncedSummary>();
        public List<SyncError> Errors { get; set; } = new List<SyncError>();
    }

    public class SyncedSummary
    {
        public string Code { get; set; }
        public string PhaseCode { get; set; }
        public string AdminWorker { get; set; }
        public string DateTimeIn { get; set; }
        public int LineCount { get; set; }
        public string SyncDate { get; set; }
        public string SyncBy { get; set; }
    }

    public class SyncError
    {
        public int ErrNo { get; set; }
        public string Code { get; set; }
        public string Scope { get; set; }
        public string Field { get; set; }
        public string Message { get; set; }
    }
}
