import { Module } from '@nestjs/common';
import { ResultSheetsController } from './result-sheets.controller';
import { ResultSheetsService } from './result-sheets.service';

@Module({
  controllers: [ResultSheetsController],
  providers: [ResultSheetsService]
})
export class ResultSheetsModule {}
