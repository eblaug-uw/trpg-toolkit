# Miroslav Pavlenko — Contributions to TRPG Toolkit

**Role:** Full-Stack Developer / DevOps & Deployment

## About this project

TRPG Toolkit is a virtual tabletop (VTT) web application for running tabletop RPG
sessions — character/campaign management, an interactive combat grid, initiative
and combat tracking, monster/loot generation, and D&D 5e/5.5e reference data.
The stack is a React + Vite frontend backed by Supabase (auth, database, storage,
edge functions), deployed to GitHub Pages with a Docker image published to GHCR.

## What I worked on

**Authentication & account management**
- Built the signup page and wired it to Supabase Auth.
- Diagnosed and fixed email-confirmation redirect flows that behaved
  differently between local development and the GitHub Pages deployment
  (differing base paths/origins between environments).
- Implemented the delete-account flow end-to-end: account menu UI plus a
  Supabase edge function (`delete-account`) to remove the user server-side.

**Virtual tabletop (VTT) features**
- Initiative/combat tracker with HP tracking and combat management.
- Stats popout window and a statuses/effects system for the VTT.
- Map drawing tools and map rotation controls.
- Monster tokens and initiative icons sourced from Supabase-hosted images.
- Performance work: optimized grid rendering and optimized map thumbnail
  loading and selection.

**Game data & content systems**
- Added support for D&D 5.5e (2024) monsters alongside a global edition
  toggle, and migrated monster reference data to a normalized snake_case
  schema.
- Integrated an XP calculator and loot generator into the toolkit, extended
  the D&D item search service, and added an Enemy Generator.
- Fixed monster search issues caused by renamed database columns.

**Team integration**
- Reviewed, merged, and adapted teammates' feature branches (combat tracker
  logic, XP calculator, loot generator) into the shared codebase, resolving
  integration conflicts along the way.

## Ways of working

- Worked in an agile team: sprints planned and tracked in **Jira**, with
  technical notes, specs, and decisions documented in **Confluence**.
- Delivered changes through feature branches and pull requests, with peer
  code review as part of the team's standard workflow.
