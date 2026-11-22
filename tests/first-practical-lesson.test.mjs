import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PRACTICAL_START_ROUTE, renderPracticalStartLesson} from "../src/professional/first-practical-lesson.mjs";
import {CREATOR_ROUTES, creatorPaths, renderCreatorPage} from "../src/professional/creator-pages.mjs";

const lesson = renderCreatorPage(PRACTICAL_START_ROUTE);
const courseHub = renderCreatorPage(CREATOR_ROUTES.courses);

test("the free first lesson has a discoverable canonical page and semantic reading structure", () => {
  assert.ok(creatorPaths.includes(PRACTICAL_START_ROUTE));
  assert.equal(PRACTICAL_START_ROUTE, "/courses/man-of-the-house/start/");
  assert.match(lesson, /<html lang="en" class="lab-html"/);
  assert.match(lesson, /<title>Start with a walk-through — Man of the House — Devon Alan Akins<\/title>/);
  assert.match(lesson, /<link rel="canonical" href="https:\/\/devonakins\.com\/courses\/man-of-the-house\/start\/"/);
  assert.match(lesson, /<main id="pc-main" tabindex="-1">/);
  assert.match(lesson, /href="\/courses\/" aria-current="page">Learn<\/a>/);
  assert.equal((lesson.match(/<h1(?:\s|>)/g) || []).length, 1);
  assert.match(lesson, /<article class="pc-wrap pc-lesson" aria-labelledby="pc-title">/);
  assert.match(lesson, /<nav class="pc-lesson-toc" aria-label="Lesson sections">/);
  assert.match(lesson, /<h2 id="lesson-complete-title">Your first lesson is complete when:/);
  const steps = ["goal", "prepare", "scan", "sort", "do", "finish"];
  const content = renderPracticalStartLesson();
  for (const id of steps) {
    assert.match(content, new RegExp('id="lesson-' + id + '"'));
    assert.match(content, new RegExp('href="#lesson-' + id + '"'));
  }
  assert.equal((content.match(/class="pc-lesson-index"/g) || []).length, 8);
  assert.equal((content.match(/<section/g) || []).length, 7);
  assert.match(courseHub, /Read the free first lesson/);
  assert.match(courseHub, /href="\/courses\/man-of-the-house\/start\/"/);
});

test("the complete written sample teaches safe action and leaves enrollment closed", () => {
  for (const phrase of [
    "15 minutes", "Paper or phone notes", "One safe improvement",
    "Know the boundary.", "smoke or carbon-monoxide alarms",
    "who will handle it", "qualified professional", "The habit matters",
    "This is a practice, not an inspection certification",
    "There is no account tracking or saved course progress here"
  ]) assert.ok(lesson.includes(phrase), phrase);
  assert.match(lesson, /not a claim that household competence belongs to one gender/);
  assert.match(lesson, /still in development/);
  assert.match(courseHub, /No courses are available for enrollment or purchase yet/);
  assert.doesNotMatch(lesson, /<iframe|<video|<audio|<form|credit.card|Buy now|Enroll now|access_token|password|patient record|Nona Workspace/i);
  assert.doesNotMatch(courseHub, /Buy now|Enroll now|fake-paywall/i);
});

test("lesson has responsive, readable, printable presentation without remote fonts", async () => {
  const style = await readFile(new URL("../src/professional/creator-pages.css", import.meta.url), "utf8");
  assert.match(style, /\.pc-lesson-layout\s*\{\s*display:\s*grid/);
  assert.match(style, /\.pc-lesson-reading h2/);
  assert.match(style, /@media \(max-width: 900px\)/);
  assert.match(style, /@media \(max-width: 620px\)/);
  assert.match(style, /@media print/);
  assert.match(style, /:focus-visible/);
  assert.doesNotMatch(style, /@import|https:\/\/fonts\.|url\(\s*https?:/);
});
