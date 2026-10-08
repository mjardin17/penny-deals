import { test } from "node:test";
import assert from "node:assert/strict";
import { centeringForSave, GRADE_COMPANIES, GRADE_VALUES, validGradeChoice } from "../src/app/cardGrade";

const measured = { photoId: 3, horizontal: 55, vertical: 60 };

test("centering is saved only for the card picked after the photo it was measured on", () => {
  assert.deepEqual(centeringForSave(measured, 3), { horizontal: 55, vertical: 60 });
  assert.equal(centeringForSave(measured, 2), null, "card picked against an older photo");
  assert.equal(centeringForSave(measured, null), null, "card picked before any photo");
  assert.equal(centeringForSave(null, 3), null, "no measurement");
});

test("a grade choice must be made: nothing is preselected", () => {
  assert.equal(validGradeChoice("", ""), false);
  assert.equal(validGradeChoice("PSA", ""), false);
  assert.equal(validGradeChoice("", "9"), false);
  assert.equal(validGradeChoice("PSA", "9"), true);
  assert.equal(validGradeChoice("PSA", "9.5"), true);
  assert.equal(validGradeChoice("XYZ", "9"), false);
  assert.equal(validGradeChoice("PSA", "11"), false);
  assert.equal(validGradeChoice("PSA", "0.5"), false);
  assert.equal(validGradeChoice("PSA", "abc"), false);
});

test("grade list runs 10 down to 1 in halves and companies are the four known ones", () => {
  assert.equal(GRADE_VALUES[0], "10");
  assert.equal(GRADE_VALUES[GRADE_VALUES.length - 1], "1");
  assert.deepEqual([...GRADE_COMPANIES], ["PSA", "BGS", "CGC", "SGC"]);
});
