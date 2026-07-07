# Mandarin Stage 1 Brief

## Confirmed Scope

Stage 1 is a basic branded online trainer for Mandarin Edu Center.

The trainer must:

- show numbers one by one;
- hide the full example before the answer;
- ask the student for the final answer after the last number;
- check the answer automatically;
- support row count from 2 to 10;
- support examples count from 1 to 50;
- support display speed from 5 seconds to 0.1 seconds;
- work well on phone and laptop screens;
- use Mandarin branding with red, orange, yellow as primary colors and green only as a secondary accent.

## Methodology Blocks

Accepted and fixed:

- units without formulas: 1-9;
- direct abacus moves only, no exchange through 5 or 10;
- examples like 4 + 5 - 8 + 1 are valid direct moves;
- examples like 4 + 1, 3 + 2, 5 - 1 are not valid in "without formulas".

Stage 1 also includes, by the same principle:

- tens without formulas: 10-90;
- identical double-digit numbers: 11-99;
- three-digit numbers: up to 999;
- formulas on 5/10 by methodist rules and examples.

## Explicitly Outside Stage 1

Not included in this stage:

- student accounts;
- parent accounts;
- teacher cabinet;
- student database;
- schedule;
- reports;
- homework;
- payment integrations;
- mobile app;
- multiplication and division.

## Inputs From Client

Already received:

- Mandarin logo;
- visual references;
- color direction: less green, more red/orange/yellow;
- legal/customer requisites;
- first methodology examples for units.

Still useful:

- structured methodist answer from ChatGPT prompt;
- more correct and incorrect examples for tens, double-digit, three-digit, and formulas;
- final decision on current Vercel link vs separate domain.

## Work Plan

Day 1:

- clean up methodology engine labels and comments for current Stage 1;
- make the product structure match the accepted scope only;
- prepare generator tests for units without formulas.

Days 2-3:

- finish first working branded link;
- verify mobile and laptop layouts;
- test one-by-one number display, answer input, and automatic check.

Days 4-7:

- add tens, identical double digits, and three-digit blocks;
- add formula blocks after methodist examples are confirmed;
- tune settings and validation.

Days 8-10:

- final QA;
- copy and brand polish;
- prepare source code transfer package;
- prepare acceptance checklist.
