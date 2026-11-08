import { BadRequestException } from '@nestjs/common';

const COURSE_LEVELS = [100, 200, 300, 400, 500, 600, 700];

export function validateCourseLevel(courseCode: string, level: number): void {
  if (!COURSE_LEVELS.includes(level)) {
    throw new BadRequestException('Invalid academic level.');
  }

  // Remove spaces and hyphens, then find the numeric course code.
  const normalizedCode = courseCode.trim().toUpperCase().replace(/[\s-]/g, '');

  const match = normalizedCode.match(/[0-9]+/);

  if (!match) {
    throw new BadRequestException(
      'Course code must contain a numeric course identifier.',
    );
  }

  const courseNumber = match[0];
  const courseLevel = Number(courseNumber[0]) * 100;

  if (courseLevel !== level) {
    throw new BadRequestException(
      `Course code ${courseCode} does not match ${level} Level.`,
    );
  }
}
