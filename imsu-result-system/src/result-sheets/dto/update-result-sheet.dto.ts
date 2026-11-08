import { PartialType } from '@nestjs/swagger';
import { CreateResultSheetDto } from './create-result-sheet.dto';

export class UpdateResultSheetDto extends PartialType(CreateResultSheetDto) {}
