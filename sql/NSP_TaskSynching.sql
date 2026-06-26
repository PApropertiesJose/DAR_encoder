USE [PA_AWTM]
GO
/****** Object:  StoredProcedure [DAR].[NSP_TaskSynching]    Script Date: 6/26/2026 9:24:12 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		JPDC
-- Create date: 06/24/2026
-- Description:	Offline Task for synching
-- exec [DAR].[NSP_TaskSynching] @DEBUG_MODE = 1
-- =============================================
ALTER PROCEDURE [DAR].[NSP_TaskSynching]
	@TASK_HDR	[DAR].[UDT_TaskHeader]	READONLY
,	@TASK_LINE	[DAR].[UDT_TaskLine] READONLY
,	@DEBUG_MODE BIT = 0

AS
BEGIN
    SET NOCOUNT ON  -- <-- add this, prevents rowcount messages per DML
	SET ARITHABORT ON;  -- ← add this too, makes ADO.NET behave like SSMS

	BEGIN /*TEMP TABLES INSERTION*/
		IF OBJECT_ID('tempdb..#TMP_HDR') IS NOT NULL
		DROP TABLE #TMP_HDR

		IF OBJECT_ID('tempdb..#TMP_LIN') IS NOT NULL
		DROP TABLE #TMP_LIN

		SELECT
			[DAR].[FNS_TaskCodeGenerate]([noahSystem], [dateTimeIn], [phaseCode], [hrisSystem], [adminWorker]) as [Code]
		,	*
		INTO #TMP_HDR
		FROM @TASK_HDR

		SELECT
			ROW_NUMBER() OVER(ORDER BY (SELECT NULL)) AS ID
		,	[DAR].[FNS_TaskCodeGenerate]([noahSystem], [dateTimeIn], [phaseCode], [hrisSystem], [adminWorker]) as [Code]
		,	*
		INTO #TMP_LIN
		FROM @TASK_LINE
	END

	BEGIN /*VALIDATION CHECKING IF THERE'S AN EXISTING OVERTIME FILED AND APPROVED*/
		IF EXISTS(
			SELECT 1
			FROM #TMP_LIN
			WHERE CAST([timeOut] AS TIME) > '16:00'
		)
		BEGIN
			DECLARE @MAX_TIMEOUT VARCHAR(20)
			DECLARE @DATE VARCHAR(20)
			DECLARE @PHASECODE VARCHAR(10)

			SELECT TOP 1
				@DATE = [dateTimeIn]
			,	@MAX_TIMEOUT = [timeOut]
			,	@PHASECODE = [phaseCode]
			FROM #TMP_LIN
			ORDER BY [timeOut] DESC

			IF NOT EXISTS(
				SELECT 1
				FROM [dbo].[ScheduledOT]
				WHERE [SchedDate] = @DATE
				AND [PhaseCode] = @PHASECODE
				AND CAST([SchedTimeOut] AS TIME) >= CAST(@MAX_TIMEOUT as TIME)
				AND [IsForApproval] = 3
			)
			BEGIN
				RAISERROR('No approved overtime or filed yet.', 16, 1)
				RETURN
			END
		END
	END

	BEGIN /*ADD ADDITIONAL COLUMNS*/
		ALTER TABLE #TMP_LIN
		ADD
			LOT_TYPE VARCHAR(20)
		,	[MODEL_CODE] VARCHAR(20)
	END

	BEGIN /*Calculate hours per activity*/
		ALTER TABLE #TMP_LIN
		ADD [HOURS] DECIMAL(10,2) NULL

		UPDATE a
			SET
				a.[HOURS] = DATEDIFF(HOUR, a.[timeIn], a.[timeOut])
		FROM #TMP_LIN a
	END

	BEGIN /*UNITS DETAILS LOT TYPE & MODEL CODE*/
		UPDATE main
			SET
				[LOT_TYPE] = x.[LotType]
			,	[MODEL_CODE] = x.[MODEL]
		FROM #TMP_LIN main
		OUTER APPLY (
			SELECT TOP 1
				[LotType]
			,	[Model]
			FROM [NOAH DATAWHSE].dbo.[UnitInventory]
			WHERE [PhaseCode] = main.[phaseCode]
			AND [BlockCode] = main.[blk]
			AND [ItemNo] = main.[Lot]
			AND [Status] = 3
			AND [SYSTEM] = 'NOAH_PAAPDC'
			ORDER BY [DATEUPDATETIME] DESC
		) x

	END

	BEGIN /*GET THE BUDGET ALLOCATED ACTIVITY PER UNIT*/
		ALTER TABLE #TMP_LIN
		ADD [BUDGET] DECIMAL(10,2)

		UPDATE main
			SET
				main.[BUDGET] = ac.[BUDGET]
		FROM #TMP_LIN main
		LEFT JOIN [dbo].[ActivityScopeOfWorkLIN] ac
		ON main.[phaseCode] = ac.[PHASE]
		AND main.[MODEL_CODE] = ac.[MODEL]
		AND main.[LOT_TYPE] = ac.[LOT_CODE]
		AND main.[noahSystem] = ac.[NOAH_SYSTEM]
		AND main.[taskCode] = ac.[CONSTRUCTION_ACTIVITY_CODE]
		AND ac.[IS_ACTIVE] = 1
	END

	BEGIN /*ACCUMULATED HOURS PER UNIT ACTIVITY*/
		ALTER TABLE #TMP_LIN
		ADD ACCUMULATED_HOURS DECIMAL(10,2)

		UPDATE main
			SET
				main.[ACCUMULATED_HOURS] = COALESCE(x.[AccumulatedHours], 0)
		FROM #TMP_LIN main
		OUTER APPLY (
			SELECT
				lin.[Blk]
			,	lin.[Lot]
			,	lin.[TaskCode]
			,	SUM([dbo].[FNS_GetOverAllHours] (lin.[DateTimeIn], lin.[DateTimeOut], 1)) [AccumulatedHours]
			FROM [dbo].[TaskAssignmentSummaryHDR] hdr
			JOIN [dbo].[TaskAssignmentSummaryLIN] lin
			ON hdr.[Code] =lin.[Code]
			WHERE lin.[Blk] = IIF(main.[category] IN ('House Unit', 'Post Task'), main.[Blk], DAR.[FNS_ShortConstructionIndexBlkLot](main.[Category]))
			AND lin.[LOT] = IIF(main.[category] IN ('House Unit', 'Post Task'), main.[Blk], DAR.[FNS_ShortConstructionIndexBlkLot](main.[Category]))
			AND lin.[TaskCode] = main.[taskCode]
			GROUP BY
				lin.[Blk]
			,	lin.[Lot]
			,	lin.[TaskCode]
		) x

	END

	BEGIN /*INCREMENTALY INCREASE THE ACCUMULATED HOURS ON EACH REPEATING ACTIVITIES WITH SAME BLK LOT*/
		ALTER TABLE #TMP_LIN
		ADD TotalAccumulatedHours DECIMAL(10,2)

		;WITH AccumulatedHoursPerActivity AS (
			SELECT
				*
			,	SUM(main.[HOURS]) OVER (
					PARTITION BY main.[Blk], main.[Lot], main.[taskCode]
					ORDER BY main.[dateTimeIn] -- Replace with your actual sequential column
					ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
				) AS CurrentAccumulatedHours
			FROM #TMP_LIN main
		)

		UPDATE main
			SET
				main.TotalAccumulatedHours = (main.[ACCUMULATED_HOURS] + tk.CurrentAccumulatedHours)
		FROM #TMP_LIN main
		JOIN AccumulatedHoursPerActivity tk
		ON main.[ID] = tk.[ID]
	END

	BEGIN /*FLAG ACTIVITIES FOR OVERBUDGET*/
		ALTER TABLE #TMP_LIN
		ADD RequiredJustification BIT

		UPDATE main
			SET
				main.RequiredJustification = IIF(main.[TotalAccumulatedHours] > main.[Budget], 1, 0)
		FROM #TMP_LIN main
	END

	BEGIN /*VALIDATE IF THERE'S JUSTICATION INPUT IF YES RETURN THE REQUEST*/
		IF EXISTS (
			SELECT 1
			FROM #TMP_LIN main
			WHERE main.[RequiredJustification] = 1
			AND main.[Justification] IS NULL
		)
		BEGIN
			SELECT * FROM #TMP_LIN
			RETURN
		END
	END

	BEGIN /*INSERT HEADER TASK TO HDR*/
		INSERT INTO [dbo].[TaskAssignmentSummaryHDR] (
			 [Code]
			,[AdminWorker]
			,[HRISSystem]
			,[NoahSystem]
			,[PhaseCode]
			,[DateTimeIn]
			,[Status]
			,[IsActive]
			,[RecUser]
			,[RecDate]
		)
		SELECT
			main.[code]
		,	main.[adminWorker]
		,	main.[hrisSystem]
		,	main.[noahSystem]
		,	main.[phaseCode]
		,	CAST(main.[dateTimeIn] AS DATE) as [dateTimeIn]
		,	main.[status]
		,	main.[isActive]
		,	main.[recUser]
		,	GETDATE() as RecDate
		FROM #TMP_HDR main
		WHERE NOT EXISTS(
			SELECT 1
			FROM [dbo].[TaskAssignmentSummaryHDR]
			WHERE [code] = main.[code]
		)
	END

	BEGIN /*FORMAT BLK & LOT TO OTH OR LAN IF NOT HOUSE UNIT*/
		UPDATE main
			SET
				main.[blk] = DAR.[FNS_ShortConstructionIndexBlkLot](main.[Category])
			,	main.[lot] = DAR.[FNS_ShortConstructionIndexBlkLot](main.[Category])
		FROM #TMP_LIN main
		WHERE main.[category] IN ('Other Task', 'Land Devt')
	END

	BEGIN /*PARSE TO DATETIME THE TIMEIN AND TIMEOUT*/
		ALTER TABLE #TMP_LIN
		ADD
			LIN_DateTimeIn DATETIME
		,	LIN_DateTimeOut DATETIME

		UPDATE #TMP_LIN
			SET
				[LIN_DateTimeIn] = CAST(CONCAT([dateTimeIn], ' ', [timeIn]) AS DATETIME)
			,	[LIN_DateTimeOut] = CAST(CONCAT([dateTimeIn], ' ', [timeOut]) AS DATETIME)


	END

	BEGIN /*include the RN in the return response to user*/
		DECLARE @INSERTED_LIN AS [DAR].[UDT_TaskLine]
	END

	BEGIN /*UPDATE ALREADY-SYNCED ACTIVITIES (RN PRESENT) INSTEAD OF RE-INSERTING*/
		UPDATE lin
			SET
				lin.[Blk]                = main.[blk]
			,	lin.[Lot]                = main.[lot]
			,	lin.[TaskCode]           = main.[taskCode]
			,	lin.[TaskDescription]    = main.[taskDescription]
			,	lin.[DateTimeIn]         = main.[LIN_DateTimeIn]
			,	lin.[DateTimeOut]        = main.[LIN_DateTimeOut]
			,	lin.[JustificationForOT] = main.[Justification]
		OUTPUT
			INSERTED.[Category]
		,   INSERTED.[Blk]
		,   INSERTED.[Lot]
		,   INSERTED.[TaskCode]
		,   INSERTED.[TaskDescription]
		,	LEFT(CONVERT(VARCHAR(8), TRY_CONVERT(TIME, INSERTED.[DateTimeIn]), 108), 5)
		,	LEFT(CONVERT(VARCHAR(8), TRY_CONVERT(TIME, INSERTED.[DateTimeOut]), 108), 5)
		,   INSERTED.[RecUser]
		,	[DAR].[FNS_ExtractPipeField](INSERTED.[Code], 4)
		,	[DAR].[FNS_ExtractPipeField](INSERTED.[Code], 2)
		,	[DAR].[FNS_ExtractPipeField](INSERTED.[Code], 3)
		,   INSERTED.[DateTimeIn]
		,   INSERTED.[JustificationForOT]
		,	INSERTED.[RN]
		INTO @INSERTED_LIN (
			[category]
		,   [blk]
		,   [lot]
		,   [taskCode]
		,   [taskDescription]
		,	[timeIn]
		,	[timeOut]
		,   [recUser]
		,	[adminWorker]
		,	[phaseCode]
		,	[hrisSystem]
		,   [dateTimeIn]
		,   [justification]
		,	[RN]
		)
		FROM [PA_AWTM].[dbo].[TaskAssignmentSummaryLIN] lin
		JOIN #TMP_LIN main
			ON TRY_CONVERT(BIGINT, main.[RN]) = lin.[RN]
		WHERE TRY_CONVERT(BIGINT, main.[RN]) > 0
	END

	BEGIN /*INSERT INTO TASK LIN and retrive the PK to tag activity already synch*/
		INSERT INTO [PA_AWTM].[dbo].[TaskAssignmentSummaryLIN] (
			[Code]
		,	[Category]
		,	[Blk]
		,	[Lot]
		,	[TaskCode]
		,	[TaskDescription]
		,	[DateTimeIn]
		,	[DateTimeOut]
		,	[IsOt]
		,	[OTBatchID]
		,	[IsActive]
		,	[RecUser]
		,	[RecDate]
		,	[IsNew]
		,	[IsEnd]
		,	[ProjectedTimeOut]
		,	[JustificationForOT]
		)
		OUTPUT
			INSERTED.[Category]
		,   INSERTED.[Blk]
		,   INSERTED.[Lot]
		,   INSERTED.[TaskCode]
		,   INSERTED.[TaskDescription]
		,	LEFT(CONVERT(VARCHAR(8), TRY_CONVERT(TIME, INSERTED.[DateTimeIn]), 108), 5)
		,	LEFT(CONVERT(VARCHAR(8), TRY_CONVERT(TIME, INSERTED.[DateTimeOut]), 108), 5)
		,   INSERTED.[RecUser]
		,	[DAR].[FNS_ExtractPipeField](INSERTED.[Code], 4)
		,	[DAR].[FNS_ExtractPipeField](INSERTED.[Code], 2)
		,	[DAR].[FNS_ExtractPipeField](INSERTED.[Code], 3)
		,   INSERTED.[DateTimeIn]
		,   INSERTED.[JustificationForOT]
		,	INSERTED.[RN]
		INTO @INSERTED_LIN (
			[category]
		,   [blk]
		,   [lot]
		,   [taskCode]
		,   [taskDescription]
		,	[timeIn]
		,	[timeOut]
		,   [recUser]
		,	[adminWorker]
		,	[phaseCode]
		,	[hrisSystem]
		,   [dateTimeIn]
		,   [justification]
		,	[RN]
		)
		SELECT
			main.[code]
		,	[DAR].[FNS_TaskLinCategoryFormat]([category]) as [lin_category]
		,	main.[blk]
		,	main.[lot]
		,	main.[taskCode]
		,	main.[taskDescription]
		,	CONVERT(VARCHAR(19), main.[LIN_DateTimeIn], 120)
		,	CONVERT(VARCHAR(19), main.[LIN_DateTimeOut], 120)
		,	IIF(main.[timeOut] > '16:00', 1, 0) as [IsOt]
		,	IIF(main.[timeOut] > '16:00', DAR.[FNS_StringToTimestamp](main.LIN_DateTimeIn), NULL)
		,	1
		,	main.[recUser]
		,	GETDATE()
		,	2
		,	1
		,	main.[LIN_DateTimeOut]
		,	main.[Justification]
		FROM #TMP_LIN main
		WHERE ISNULL(TRY_CONVERT(BIGINT, main.[RN]), 0) = 0
	END

	SELECT * FROM @INSERTED_LIN

	/*CLEAR TEMP TABLE*/
	DROP TABLE #TMP_HDR
	DROP TABLE #TMP_LIN
END
