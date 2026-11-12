# GTech City

Every GTech project as a place in one 3D city, so that someone in the business can see what exists, what state it is in, and where the gaps are, without reading a repository.

## Problem

GTech runs many projects. Each has its own repository, its own README, its own MCP server and its own team. Nobody outside a project can see it:

- A business lead cannot tell which projects exist, what each one is for, what it costs or who to ask about it.
- Two teams build the same thing because neither knew of the other.
- A gap (a business problem with no project, a project with no owner, a project nobody has touched in months) is found late, by accident.
- The information exists, in READMEs, in git and in the internal apps catalogue, but it is spread out and written for engineers.

## What this is

One page. The world view shows every project as an object whose shape says what kind of project it is. A click enters a project and shows its buildings (apps and packages), its floors (modules, as tall as their file count), how its parts depend on each other, and its team.

It is meant to answer, for someone in business development:

1. What do we have? Every project, comparable at a glance.
2. What state is it in? Size, activity, share of tests, last change.
3. Where are the gaps? Problems with no project, projects with no owner, overlap between projects. _(not built yet)_
4. What does it cost and who do I ask? _(cost not built yet; the team shown is mock data)_

Agents that work between projects (business development first, then DevOps) are planned to read the same data and propose actions. None is built yet.

## What is real and what is mock

| Shown                                                                              | Source                                                                  |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A project's buildings, floors, file and line counts, dependencies, stack, services | Read from the repository by `tools/scan.mjs`                            |
| Commits, contributor count, last commit                                            | Read from git, as counts only: no names                                 |
| The object a project is drawn as                                                   | Matched by rule from its name and summary, or set by hand with `--kind` |
| **People: names, the four traits, contributions, quality**                         | **Invented from a seed. Nothing is read from git, HR or an interview**  |

## Run it

```
node tools/scan.mjs --repo <path to a local repository> --id <id> --name <Name> [--kind <kind>]
open site/index.html
```

Kinds: `city`, `map-stack`, `racks`, `houses`, `tunnel`, `robot`.

Scanned districts are written to `site/districts/` and are not committed: a district file holds a repository's structure, and a private repository's structure stays off the remote.

`tools/shot.sh <out.png> [query]` takes a screenshot in headless Chrome, for example `tools/shot.sh /tmp/a.png "enter=<id>&explode=1"`.
