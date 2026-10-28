import test from "node:test";
import assert from "node:assert/strict";
import { validateMeal, normalizeMeals, loadMeals, saveMeals, STORAGE_KEY, LEGACY_STORAGE_KEY } from "../js/storage.js";

const meal = { id: "m1", date: "2026-10-27", type: "Comida", food: "Arroz", time: "13:10", drink: "Agua", notes: "" };
function fakeStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    values
  };
}

test("validateMeal accepts a complete valid record", () => {
  assert.equal(validateMeal(meal).valid, true);
});
test("validateMeal rejects missing food, invalid date, type and time", () => {
  assert.equal(validateMeal({ ...meal, food: " " }).valid, false);
  assert.equal(validateMeal({ ...meal, date: "2026-02-30" }).valid, false);
  assert.equal(validateMeal({ ...meal, type: "Snack" }).valid, false);
  assert.equal(validateMeal({ ...meal, time: "25:99" }).valid, false);
});
test("normalizeMeals rejects a non-array and duplicate ids are replaced", () => {
  assert.equal(normalizeMeals({}).valid, false);
  const result = normalizeMeals([meal, meal]);
  assert.equal(result.valid, true);
  assert.notEqual(result.meals[0].id, result.meals[1].id);
});
test("saveMeals and loadMeals round-trip records", () => {
  const storage = fakeStorage();
  assert.equal(saveMeals([meal], storage).ok, true);
  assert.deepEqual(loadMeals(storage).meals, [meal]);
  assert.ok(storage.values.has(STORAGE_KEY));
});
test("loadMeals migrates legacy key to in-memory records", () => {
  const storage = fakeStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify([meal]) });
  const result = loadMeals(storage);
  assert.equal(result.ok, true);
  assert.equal(result.meals[0].food, "Arroz");
  assert.equal(result.migrated, true);
});
test("loadMeals handles corrupt stored JSON without throwing", () => {
  const result = loadMeals(fakeStorage({ [STORAGE_KEY]: "{" }));
  assert.equal(result.ok, false);
});
test("saveMeals reports unavailable or failing storage", () => {
  assert.equal(saveMeals([meal], { setItem() { throw new Error("quota"); } }).ok, false);
});
