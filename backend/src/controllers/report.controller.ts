import { Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthRequest } from '../types';

export class ReportController {
  static async getEventReport(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const eventId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const forceRefresh = req.query.refresh === 'true';

      const report = await ReportService.getEventReport(
        eventId,
        userId,
        userRole,
        forceRefresh
      );

      return sendSuccess(
        res,
        report,
        'Event attendance report retrieved.'
      );
    } catch (error) {
      next(error);
    }
  }

  static async exportEventReportCsv(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const eventId = req.params.id as string;
      const userId = req.user!.userId;
      const userRole = req.user!.role;

      const { filename, csvContent } =
        await ReportService.exportEventReportCsv(
          eventId,
          userId,
          userRole
        );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      return res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}