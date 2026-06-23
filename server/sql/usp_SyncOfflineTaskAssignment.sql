/* =====================================================================================
   DAR.usp_SyncOfflineTaskAssignment        (SQL Server 2012 compatible)
   -------------------------------------------------------------------------------------
   Syncs the offline TaskEntryForm payload into:
        DAR.OfflineTaskAssignmentSummaryHDR
        DAR.OfflineTaskAssignmentSummaryLIN

   ALL business logic (shredding, validation, upsert, sync stamping) lives here so the
   API stays a thin pass-through.

   NOTE ON FORMAT:
     SQL Server 2012 has NO native JSON (OPENJSON/JSON_VALUE/ISJSON are 2016+), so the
     payload is passed as typed XML and shredded with .nodes()/.value(). The Web API
     deserializes the client JSON and re-serializes it to this XML shape before calling.
     See server/samples/sync-payload.sample.xml.

   Strategy:
     * Each <summary> is keyed by a generated [Code]:
           fns_NoahSystemAlias(NoahSystem) | PhaseCode | AdminSystem(MANUAL->MAN)
                                           | AdminId | yyyyMMdd(DateTimeIn)
     * A re-sync of the same Code is idempotent: existing HDR + LIN rows for that Code
       are deleted and re-inserted.
     * Validation runs BEFORE any write. If ANY row fails, NOTHING is written and the
       full error list is returned (set #1) with @ReturnCode = 1.
     * On success the rows are stamped IsSync = 1, SyncDate, SyncBy and a per-Code
       summary is returned (set #1) with @ReturnCode = 0.

   Params:
     @Xml      XML            -- the full payload (see server/samples/sync-payload.sample.xml)
     @SyncBy   VARCHAR(40)    -- who triggered the sync (overrides payload syncBy when supplied)

   Output:
     @ReturnCode INT  0 = success, 1 = validation failed, 2 = unexpected error
     @Message    NVARCHAR(4000)
   ===================================================================================== */
IF OBJECT_ID('DAR.usp_SyncOfflineTaskAssignment', 'P') IS NOT NULL
    DROP PROCEDURE DAR.usp_SyncOfflineTaskAssignment;
GO

CREATE PROCEDURE DAR.usp_SyncOfflineTaskAssignment
    @Xml         XML,
    @SyncBy      VARCHAR(40)        = NULL,
    @ReturnCode  INT                = NULL OUTPUT,
    @Message     NVARCHAR(4000)     = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME = GETDATE();

    -- Collected validation errors. Returned to the caller when anything fails.
    DECLARE @Errors TABLE
    (
        ErrNo     INT IDENTITY(1,1),
        Code      VARCHAR(155),
        Scope     VARCHAR(10),      -- 'PAYLOAD' | 'HDR' | 'LIN'
        Field     VARCHAR(50),
        Message   NVARCHAR(400)
    );

    BEGIN TRY
        /* -------------------------------------------------------------------------
           0. Envelope checks
           ------------------------------------------------------------------------- */
        IF (@Xml IS NULL OR @Xml.exist('/sync/summaries/summary') = 0)
        BEGIN
            INSERT @Errors (Code, Scope, Field, Message)
            VALUES (NULL, 'PAYLOAD', 'summaries', 'Payload is empty or contains no summaries.');
            GOTO Fail;
        END

        -- Resolve who is syncing: explicit param wins, else payload syncBy / recUser.
        DECLARE @PayloadSyncBy  VARCHAR(40) = @Xml.value('(/sync/syncBy/text())[1]', 'varchar(40)');
        DECLARE @PayloadRecUser VARCHAR(50) =
            COALESCE(@Xml.value('(/sync/recUser/text())[1]', 'varchar(50)'), @PayloadSyncBy);

        SET @SyncBy = COALESCE(NULLIF(LTRIM(RTRIM(@SyncBy)), ''), @PayloadSyncBy);

        IF (@SyncBy IS NULL OR LEN(@SyncBy) = 0)
        BEGIN
            INSERT @Errors (Code, Scope, Field, Message)
            VALUES (NULL, 'PAYLOAD', 'syncBy', 'syncBy is required (pass as param or in payload).');
            GOTO Fail;
        END

        /* -------------------------------------------------------------------------
           1. Shred HDR + generate Code
           ------------------------------------------------------------------------- */
        DECLARE @Hdr TABLE
        (
            RowNo        INT IDENTITY(1,1),
            Code         VARCHAR(155),   -- generated; see CONCAT below
            AdminWorker  VARCHAR(80),
            AdminSystem  VARCHAR(80),
            AdminId      VARCHAR(80),
            HRISSystem   VARCHAR(80),
            NoahSystem   VARCHAR(80),
            PhaseCode    VARCHAR(80),
            DateTimeIn   DATE,
            Status       INT,
            IsActive     INT,
            RecUser      VARCHAR(50),
            LinesXml     XML
        );

        /*  Code format (house standard):
                fns_NoahSystemAlias(NoahSystem) | PhaseCode | AdminSystem(MANUAL->MAN)
                                                | AdminId | yyyyMMdd(DateTimeIn)
            e.g.  NSA|PH-001A|MAN|ADM00123|20260616                                  */
        INSERT @Hdr (Code, AdminWorker, AdminSystem, AdminId, HRISSystem, NoahSystem,
                     PhaseCode, DateTimeIn, Status, IsActive, RecUser, LinesXml)
        SELECT
            CONCAT(
                DBO.fns_NoahSystemAlias(s.value('(noahSystem/text())[1]', 'varchar(80)')), '|',
                s.value('(phaseCode/text())[1]', 'varchar(80)'), '|',
                CASE WHEN s.value('(adminSystem/text())[1]', 'varchar(80)') = 'MANUAL'
                     THEN 'MAN'
                     ELSE s.value('(adminSystem/text())[1]', 'varchar(80)') END, '|',
                COALESCE(NULLIF(LTRIM(RTRIM(s.value('(adminId/text())[1]', 'varchar(80)'))), ''),
                         s.value('(adminWorker/text())[1]', 'varchar(80)')), '|',
                CONVERT(VARCHAR(8), TRY_CONVERT(DATETIME, s.value('(dateTimeIn/text())[1]', 'varchar(30)')), 112)
            ),
            s.value('(adminWorker/text())[1]', 'varchar(80)'),
            COALESCE(NULLIF(LTRIM(RTRIM(s.value('(adminSystem/text())[1]', 'varchar(80)'))), ''), 'MANUAL'),
            COALESCE(NULLIF(LTRIM(RTRIM(s.value('(adminId/text())[1]', 'varchar(80)'))), ''),
                     s.value('(adminWorker/text())[1]', 'varchar(80)')),
            s.value('(hrisSystem/text())[1]', 'varchar(80)'),
            s.value('(noahSystem/text())[1]', 'varchar(80)'),
            s.value('(phaseCode/text())[1]', 'varchar(80)'),
            TRY_CONVERT(DATE, s.value('(dateTimeIn/text())[1]', 'varchar(30)')),
            ISNULL(s.value('(status/text())[1]', 'int'), 0),
            ISNULL(s.value('(isActive/text())[1]', 'int'), 1),
            COALESCE(s.value('(recUser/text())[1]', 'varchar(50)'), @PayloadRecUser, @SyncBy),
            s.query('lines')
        FROM @Xml.nodes('/sync/summaries/summary') AS T(s);

        IF (SELECT COUNT(*) FROM @Hdr) = 0
        BEGIN
            INSERT @Errors (Code, Scope, Field, Message)
            VALUES (NULL, 'PAYLOAD', 'summaries', 'No summaries found in payload.');
            GOTO Fail;
        END

        /* -------------------------------------------------------------------------
           2. Shred LIN (lines hang off their parent HDR row)
           ------------------------------------------------------------------------- */
        DECLARE @Lin TABLE
        (
            RowNo               INT IDENTITY(1,1),
            Code                VARCHAR(155),
            Category            VARCHAR(MAX),
            Blk                 VARCHAR(80),
            Lot                 VARCHAR(80),
            TaskCode            VARCHAR(50),
            TaskDescription     VARCHAR(MAX),
            DateTimeIn          VARCHAR(20),
            DateTimeOut         VARCHAR(20),
            IsOT                INT,
            OTBatchID           VARCHAR(100),
            OTCategory          VARCHAR(20),
            OTTargetIn          VARCHAR(20),
            OTTargetOut         VARCHAR(20),
            IsActive            INT,
            RecUser             VARCHAR(50),
            IsNew               INT,
            IsEnd               INT,
            ProjectedTimeOut    DATETIME,
            JustificationForOt  NVARCHAR(MAX),
            UploadedCode        VARCHAR(120)
        );

        INSERT @Lin (Code, Category, Blk, Lot, TaskCode, TaskDescription, DateTimeIn,
                     DateTimeOut, IsOT, OTBatchID, OTCategory, OTTargetIn, OTTargetOut,
                     IsActive, RecUser, IsNew, IsEnd, ProjectedTimeOut,
                     JustificationForOt, UploadedCode)
        SELECT
            h.Code,
            l.value('(category/text())[1]', 'varchar(max)'),
            l.value('(blk/text())[1]', 'varchar(80)'),
            l.value('(lot/text())[1]', 'varchar(80)'),
            l.value('(taskCode/text())[1]', 'varchar(50)'),
            l.value('(taskDescription/text())[1]', 'varchar(max)'),
            l.value('(dateTimeIn/text())[1]', 'varchar(20)'),
            l.value('(dateTimeOut/text())[1]', 'varchar(20)'),
            ISNULL(l.value('(isOT/text())[1]', 'int'), 0),
            l.value('(otBatchID/text())[1]', 'varchar(100)'),
            l.value('(otCategory/text())[1]', 'varchar(20)'),
            l.value('(otTargetIn/text())[1]', 'varchar(20)'),
            l.value('(otTargetOut/text())[1]', 'varchar(20)'),
            ISNULL(l.value('(isActive/text())[1]', 'int'), 1),
            COALESCE(l.value('(recUser/text())[1]', 'varchar(50)'), h.RecUser, @SyncBy),
            ISNULL(l.value('(isNew/text())[1]', 'int'), 1),
            ISNULL(l.value('(isEnd/text())[1]', 'int'), 0),
            TRY_CONVERT(DATETIME, l.value('(projectedTimeOut/text())[1]', 'varchar(30)')),
            l.value('(justificationForOt/text())[1]', 'nvarchar(max)'),
            l.value('(uploadedCode/text())[1]', 'varchar(120)')
        FROM @Hdr h
        CROSS APPLY h.LinesXml.nodes('/lines/line') AS T(l);

        /* =========================================================================
           3. VALIDATION  (collect everything, write nothing yet)
           ========================================================================= */

        -- 3.1 HDR: AdminId required (it is a component of the generated Code)
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT h.Code, 'HDR', 'adminId', 'Admin id is required (needed to generate the summary code).'
        FROM @Hdr h
        WHERE NULLIF(LTRIM(RTRIM(h.AdminId)), '') IS NULL;

        -- 3.2 HDR: PhaseCode required
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT h.Code, 'HDR', 'phaseCode', 'Phase code is required.'
        FROM @Hdr h
        WHERE NULLIF(LTRIM(RTRIM(h.PhaseCode)), '') IS NULL;

        -- 3.3 HDR: AdminWorker required
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT h.Code, 'HDR', 'adminWorker', 'Admin/worker is required.'
        FROM @Hdr h
        WHERE NULLIF(LTRIM(RTRIM(h.AdminWorker)), '') IS NULL;

        -- 3.4 HDR: DateTimeIn must be a valid date
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT h.Code, 'HDR', 'dateTimeIn', 'dateTimeIn is missing or not a valid date.'
        FROM @Hdr h
        WHERE h.DateTimeIn IS NULL;

        -- 3.5 HDR: two summaries resolve to the same generated Code
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT h.Code, 'HDR', 'code', 'Duplicate summary: two rows generate the same code (' + h.Code + ').'
        FROM @Hdr h
        WHERE h.Code IS NOT NULL
        GROUP BY h.Code
        HAVING COUNT(*) > 1;

        -- 3.6 HDR: every summary must carry at least one line
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT h.Code, 'HDR', 'lines', 'Summary has no activity lines.'
        FROM @Hdr h
        WHERE NOT EXISTS (SELECT 1 FROM @Lin l WHERE l.Code = h.Code);

        -- 3.7 LIN: TaskCode required
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT l.Code, 'LIN', 'taskCode', 'Task code is required on every activity line.'
        FROM @Lin l
        WHERE NULLIF(LTRIM(RTRIM(l.TaskCode)), '') IS NULL;

        -- 3.8 LIN: time format must be HH:mm (24h)
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT l.Code, 'LIN', 'dateTimeIn',
               'Time In "' + ISNULL(l.DateTimeIn, '') + '" is not in HH:mm format (task ' + ISNULL(l.TaskCode, '?') + ').'
        FROM @Lin l
        WHERE l.DateTimeIn IS NOT NULL
          AND l.DateTimeIn NOT LIKE '[0-2][0-9]:[0-5][0-9]';

        INSERT @Errors (Code, Scope, Field, Message)
        SELECT l.Code, 'LIN', 'dateTimeOut',
               'Time Out "' + ISNULL(l.DateTimeOut, '') + '" is not in HH:mm format (task ' + ISNULL(l.TaskCode, '?') + ').'
        FROM @Lin l
        WHERE l.DateTimeOut IS NOT NULL
          AND l.DateTimeOut NOT LIKE '[0-2][0-9]:[0-5][0-9]';

        -- 3.9 LIN: Time Out must be after Time In (only when both parse cleanly)
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT l.Code, 'LIN', 'dateTimeOut',
               'Time Out must be later than Time In (task ' + ISNULL(l.TaskCode, '?') + ').'
        FROM @Lin l
        WHERE l.DateTimeIn  LIKE '[0-2][0-9]:[0-5][0-9]'
          AND l.DateTimeOut LIKE '[0-2][0-9]:[0-5][0-9]'
          AND (CONVERT(INT, LEFT(l.DateTimeOut, 2)) * 60 + CONVERT(INT, RIGHT(l.DateTimeOut, 2)))
              <= (CONVERT(INT, LEFT(l.DateTimeIn, 2)) * 60 + CONVERT(INT, RIGHT(l.DateTimeIn, 2)));

        -- 3.10 LIN: activities ending past 16:00 must carry a justification
        --       (mirrors the front-end SIXTEEN rule in TaskSheet.jsx)
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT l.Code, 'LIN', 'justificationForOt',
               'Activity ' + ISNULL(l.TaskCode, '?') + ' ends past 16:00 and requires a justification.'
        FROM @Lin l
        WHERE l.DateTimeOut LIKE '[0-2][0-9]:[0-5][0-9]'
          AND (CONVERT(INT, LEFT(l.DateTimeOut, 2)) * 60 + CONVERT(INT, RIGHT(l.DateTimeOut, 2))) > (16 * 60)
          AND NULLIF(LTRIM(RTRIM(l.JustificationForOt)), '') IS NULL;

        -- 3.11 LIN: OT lines must reference an OT batch
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT l.Code, 'LIN', 'otBatchID',
               'Activity ' + ISNULL(l.TaskCode, '?') + ' is flagged IsOT but has no OTBatchID.'
        FROM @Lin l
        WHERE l.IsOT = 1
          AND NULLIF(LTRIM(RTRIM(l.OTBatchID)), '') IS NULL;

        -- 3.12 LIN: overlapping time ranges within the same summary (same admin)
        INSERT @Errors (Code, Scope, Field, Message)
        SELECT DISTINCT a.Code, 'LIN', 'dateTimeIn',
               'Overlapping activities: ' + ISNULL(a.TaskCode, '?') + ' and ' + ISNULL(b.TaskCode, '?') + '.'
        FROM @Lin a
        JOIN @Lin b
          ON a.Code = b.Code
         AND a.RowNo < b.RowNo
        WHERE a.DateTimeIn  LIKE '[0-2][0-9]:[0-5][0-9]' AND a.DateTimeOut LIKE '[0-2][0-9]:[0-5][0-9]'
          AND b.DateTimeIn  LIKE '[0-2][0-9]:[0-5][0-9]' AND b.DateTimeOut LIKE '[0-2][0-9]:[0-5][0-9]'
          AND (CONVERT(INT, LEFT(a.DateTimeIn,2))*60 + CONVERT(INT, RIGHT(a.DateTimeIn,2)))
              < (CONVERT(INT, LEFT(b.DateTimeOut,2))*60 + CONVERT(INT, RIGHT(b.DateTimeOut,2)))
          AND (CONVERT(INT, LEFT(b.DateTimeIn,2))*60 + CONVERT(INT, RIGHT(b.DateTimeIn,2)))
              < (CONVERT(INT, LEFT(a.DateTimeOut,2))*60 + CONVERT(INT, RIGHT(a.DateTimeOut,2)));

        IF EXISTS (SELECT 1 FROM @Errors)
            GOTO Fail;

        /* =========================================================================
           4. PERSIST  (idempotent upsert by Code)
           ========================================================================= */
        BEGIN TRANSACTION;

        -- Remove any prior staged rows for the Codes in this batch so a re-sync
        -- is clean and idempotent.
        DELETE lin
        FROM DAR.OfflineTaskAssignmentSummaryLIN lin
        WHERE lin.Code IN (SELECT Code FROM @Hdr);

        DELETE hdr
        FROM DAR.OfflineTaskAssignmentSummaryHDR hdr
        WHERE hdr.Code IN (SELECT Code FROM @Hdr);

        INSERT INTO DAR.OfflineTaskAssignmentSummaryHDR
        (
            Code, AdminWorker, HRISSystem, NoahSystem, PhaseCode, DateTimeIn,
            [Status], IsActive, RecUser, RecDate, IsSync, SyncDate, SyncBy
        )
        SELECT
            h.Code, h.AdminWorker, h.HRISSystem, h.NoahSystem, h.PhaseCode, h.DateTimeIn,
            h.Status, h.IsActive, h.RecUser, @Now, 1, @Now, @SyncBy
        FROM @Hdr h;

        INSERT INTO DAR.OfflineTaskAssignmentSummaryLIN
        (
            Code, Category, Blk, Lot, TaskCode, TaskDescription, DateTimeIn, DateTimeOut,
            IsOT, OTBatchID, OTCategory, OTTargetIn, OTTargetOut, IsActive, RecUser, RecDate,
            LastDateSync, IsNew, IsEnd, ProjectedTimeOut, JustificationForOt, UploadedCode
        )
        SELECT
            l.Code, l.Category, l.Blk, l.Lot, l.TaskCode, l.TaskDescription, l.DateTimeIn, l.DateTimeOut,
            l.IsOT, l.OTBatchID, l.OTCategory, l.OTTargetIn, l.OTTargetOut, l.IsActive, l.RecUser, @Now,
            CONVERT(VARCHAR(30), @Now, 126), l.IsNew, l.IsEnd, l.ProjectedTimeOut, l.JustificationForOt, l.UploadedCode
        FROM @Lin l;

        COMMIT TRANSACTION;

        /* -------------------------------------------------------------------------
           5. Success result: per-Code summary
           ------------------------------------------------------------------------- */
        SET @ReturnCode = 0;
        SET @Message = 'Sync completed: '
            + CONVERT(VARCHAR(10), (SELECT COUNT(*) FROM @Hdr)) + ' summary(ies), '
            + CONVERT(VARCHAR(10), (SELECT COUNT(*) FROM @Lin)) + ' line(s).';

        SELECT
            h.Code,
            h.PhaseCode,
            h.AdminWorker,
            h.DateTimeIn,
            LineCount = (SELECT COUNT(*) FROM @Lin l WHERE l.Code = h.Code),
            IsSync    = 1,
            SyncDate  = @Now,
            SyncBy    = @SyncBy
        FROM @Hdr h
        ORDER BY h.RowNo;

        RETURN 0;

        /* ===================================================================== */
Fail:
        SET @ReturnCode = 1;
        SET @Message = CONVERT(VARCHAR(10), (SELECT COUNT(*) FROM @Errors))
                     + ' validation error(s) found. Nothing was synced.';

        SELECT ErrNo, Code, Scope, Field, Message
        FROM @Errors
        ORDER BY ErrNo;

        RETURN 1;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @ReturnCode = 2;
        SET @Message = 'Unexpected error: ' + ERROR_MESSAGE()
                     + ' (line ' + CONVERT(VARCHAR(10), ERROR_LINE()) + ').';

        SELECT
            ErrNo   = 0,
            Code    = CONVERT(VARCHAR(155), NULL),
            Scope   = 'SERVER',
            Field   = CONVERT(VARCHAR(50), NULL),
            Message = @Message;

        RETURN 2;
    END CATCH
END
GO
