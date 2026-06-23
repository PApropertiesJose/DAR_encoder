using System.Threading.Tasks;
using DAR.OfflineSync.Api.Data;
using DAR.OfflineSync.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace DAR.OfflineSync.Api.Controllers
{
    [Route("api/offline-task-sync")]
    [ApiController]
    public class OfflineTaskSyncController : ControllerBase
    {
        private readonly IOfflineTaskSyncRepository _repository;

        public OfflineTaskSyncController(IOfflineTaskSyncRepository repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// POST api/offline-task-sync
        /// Accepts the offline TaskEntryForm payload and hands it to the stored proc.
        /// All validation lives in SQL; this endpoint only translates the proc result
        /// into the right HTTP status.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(SyncResult), 200)]
        [ProducesResponseType(typeof(SyncResult), 422)]
        [ProducesResponseType(typeof(SyncResult), 500)]
        public async Task<IActionResult> Sync([FromBody] SyncPayload payload)
        {
            if (payload == null || payload.Summaries == null || payload.Summaries.Count == 0)
            {
                return BadRequest(new SyncResult
                {
                    Success = false,
                    ReturnCode = 1,
                    Message = "Payload is empty: at least one summary is required."
                });
            }

            var syncBy = string.IsNullOrWhiteSpace(payload.SyncBy) ? payload.RecUser : payload.SyncBy;
            var result = await _repository.SyncAsync(payload, syncBy);

            switch (result.ReturnCode)
            {
                case 0:
                    return Ok(result);
                case 1:
                    return UnprocessableEntity(result);   // 422 — validation failed, nothing written
                default:
                    return StatusCode(500, result);       // 2 — unexpected server/SQL error
            }
        }
    }
}
