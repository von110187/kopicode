// The agent: three moves the business could make, each worked out by rule from what
// the city already holds, and each with a what-if of the figures before and after.
// Nothing here is a model's opinion and nothing is drawn at random: the same catalogue
// gives the same moves. It draws nothing in the world; city.js does that.
//
//   merge  two products that work on one problem: keep the one more people use
//   staff  a project the stall rule marks, with the people who fit its open seat best
//   start  a project for a problem that has none, with people who are on no project
//
// One move of each kind is offered: the merge that saves the most, the stalling
// project the most people use, and the uncovered problem the most free people want.
window.GTECH_AGENT = (function () {
  "use strict";
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var fmt = function (n) {
    return Math.round(n).toLocaleString("en-MY");
  };
  var rm = function (n) {
    return "RM " + fmt(n);
  };
  var signed = function (n, unit) {
    return (
      (n > 0 ? "+" : n < 0 ? "−" : "") +
      (unit === "rm" ? rm(Math.abs(n)) : fmt(Math.abs(n)))
    );
  };
  var median = function (xs) {
    var s = xs.slice().sort(function (a, b) {
      return a - b;
    });
    return s.length ? s[Math.floor((s.length - 1) / 2)] : 0;
  };

  /** Keep the product more people use, retire the other: what it saves, and what else falls or opens with it. */
  function mergeOf(gap, world) {
    var pair = gap.apps
      .map(function (id) {
        return world.apps.filter(function (a) {
          return a.id === id;
        })[0];
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return (b.users || 0) - (a.users || 0);
      });
    if (pair.length < 2) return null;
    var keep = pair[0];
    var retire = pair[1];
    var gone = world.gaps.filter(function (g) {
      return g.apps.indexOf(retire.id) >= 0;
    });
    // A problem only the retired product worked on would be left with no project.
    var opened = retire.problems.filter(function (id) {
      return !world.apps.some(function (a) {
        return a !== retire && a.problems.indexOf(id) >= 0;
      });
    });
    return {
      id: "merge:" + retire.id,
      kind: "merge",
      title: "Merge " + retire.name + " into " + keep.name,
      why:
        "Both work on one problem. " +
        keep.name +
        " has " +
        fmt(keep.users || 0) +
        " users, " +
        retire.name +
        " " +
        fmt(retire.users || 0) +
        ".",
      worth: retire.costMonth,
      gain: rm(retire.costMonth) + " a month saved",
      delta: {
        gaps: opened.length - gone.length,
        cost: -retire.costMonth,
        // A retired product can no longer stall.
        stall: world.stallingIds.indexOf(retire.id) >= 0 ? -1 : 0,
      },
      closes: gone.map(function (g) {
        return g.says;
      }),
      places: [keep.id, retire.id],
      retire: retire.id,
      rows: [
        ["Users to move", fmt(retire.users || 0)],
        ["Kept", keep.name],
        ["Retired", retire.name],
      ],
      people: [],
      assumes: [
        "The cost of moving users and data is not counted.",
        opened.length
          ? opened.length +
            " problem only " +
            retire.name +
            " worked on is left with no project, and is counted."
          : "Every problem " + retire.name + " worked on is still covered.",
      ].concat(
        world.stallingIds.indexOf(retire.id) >= 0
          ? [
              retire.name +
                " is itself likely to stall, and comes off that list.",
            ]
          : [],
      ),
    };
  }

  /** Put the people who fit a stalling project's open seat best onto it. */
  function staffOf(project) {
    var who = project.candidates;
    if (!who.length) return null;
    var app = project.app;
    return {
      id: "staff:" + project.id,
      kind: "staff",
      title: "Staff " + project.name + " before it stalls",
      why:
        project.name +
        " has had no commit in " +
        project.quiet +
        " days and is short of a " +
        project.seat.toLowerCase() +
        (app && app.users ? ". " + fmt(app.users) + " people use it." : "."),
      worth: (app && app.users) || 0,
      gain: fmt((app && app.users) || 0) + " users kept served",
      delta: { gaps: 0, cost: 0, stall: -1 },
      closes: [],
      places: [project.id],
      flare: project.id,
      rows: [["At risk", project.problems.join("; ") || "no listed problem"]],
      people: who.map(function (c) {
        return {
          name: c.name,
          says: "fit " + c.score,
          before: c.spare,
          after: Math.max(0, c.spare - 40),
        };
      }),
      assumes: [
        "A project that gains people is taken as worked on again. The stall rule was tested on commits, not on staffing, so this step is an assumption.",
        "A person gives 40% of a week to each project they are on.",
      ],
    };
  }

  /** Start a project for a problem with none, with the free people who want that kind of work. */
  function startOf(gap, world) {
    var problem = world.problems.filter(function (p) {
      return p.id === gap.problem;
    })[0];
    if (!problem) return null;
    var drawn = world.free.filter(function (p) {
      return p.area === problem.area;
    });
    var team = drawn
      .concat(
        world.free.filter(function (p) {
          return p.area !== problem.area;
        }),
      )
      .slice(0, 3);
    var cost = median(
      world.apps.map(function (a) {
        return a.costMonth;
      }),
    );
    return {
      id: "start:" + problem.id,
      kind: "start",
      title: "Start a project for: " + problem.name,
      why:
        "No project works on it. " +
        drawn.length +
        " of the " +
        world.free.length +
        " people on no project want " +
        problem.area +
        " work.",
      worth: drawn.length,
      gain: "1 problem covered",
      delta: { gaps: -1, cost: cost, stall: 0 },
      closes: [gap.says],
      places: [],
      rows: [["Area", problem.area]],
      people: team.map(function (p) {
        return {
          name: p.name,
          says:
            p.area === problem.area
              ? "wants " + p.area + " work"
              : "free, wants " + p.area + " work",
          before: p.spare,
          after: Math.max(0, p.spare - 40),
        };
      }),
      assumes: [
        "Its running cost is taken as the median of today's projects (" +
          rm(cost) +
          " a month). It is a placeholder, not an estimate of this project.",
        "It has no place in the world until it has a repository.",
      ],
    };
  }

  var best = function (list) {
    return list.filter(Boolean).sort(function (a, b) {
      return b.worth - a.worth;
    })[0];
  };

  /**
   * The moves, one of each kind where there is one, in this order: money saved, users
   * kept served, a problem covered.
   * world: { apps, problems, gaps, stalling: [{id, name, app, quiet, seat, problems, candidates}], free: [{name, area, spare}] }
   */
  function moves(world) {
    var by = function (rule) {
      return world.gaps.filter(function (g) {
        return g.rule === rule;
      });
    };
    return [
      best(
        by("overlap").map(function (g) {
          return mergeOf(g, world);
        }),
      ),
      best(world.stalling.map(staffOf)),
      best(
        by("no-project").map(function (g) {
          return startOf(g, world);
        }),
      ),
    ].filter(Boolean);
  }

  /** The figures with the moves applied: the three the cards show before and after. */
  function after(base, list, applied) {
    var out = { gaps: base.gaps, cost: base.cost, stall: base.stall };
    list.forEach(function (m) {
      if (!applied[m.id]) return;
      out.gaps += m.delta.gaps;
      out.cost += m.delta.cost;
      out.stall += m.delta.stall;
    });
    return out;
  }

  var BACK = "font-size:12px;padding:3px 10px;margin:0 0 8px";
  var NOTE =
    '<p class="sub" style="margin:10px 0 0">Worked out by rule from the catalogue, the roster and the stall rule. Every figure is dummy; no model wrote any of it.</p>';

  function listCard(list, applied, base) {
    var now = after(base, list, applied);
    var any = list.some(function (m) {
      return applied[m.id];
    });
    return (
      '<button data-agent-home="1" style="' +
      BACK +
      "\">← World</button><h2>The agent's moves</h2>" +
      '<p class="sub">what to do next, and what each would change</p>' +
      '<div class="facts"><div><b>' +
      now.gaps +
      "</b><span>gaps" +
      (any ? " (" + base.gaps + " now)" : "") +
      "</span></div><div><b>" +
      rm(now.cost) +
      "</b><span>a month" +
      (any ? " (" + rm(base.cost) + " now)" : "") +
      "</span></div><div><b>" +
      now.stall +
      "</b><span>likely to stall" +
      (any ? " (" + base.stall + " now)" : "") +
      "</span></div></div>" +
      (list.length
        ? "<table><tr><th>Move</th><th>Gets</th></tr>" +
          list
            .map(function (m, i) {
              return (
                '<tr data-move="' +
                esc(m.id) +
                '" style="cursor:pointer"><td><b>' +
                (i + 1) +
                ". " +
                esc(m.title) +
                "</b>" +
                (applied[m.id]
                  ? ' <span style="color:#1b7f4b">applied</span>'
                  : "") +
                '<br><span style="color:var(--muted);font-size:11px">' +
                esc(m.why) +
                "</span></td><td>" +
                esc(m.gain) +
                "</td></tr>"
              );
            })
            .join("") +
          "</table>"
        : '<p class="sub">The rules find no move to make.</p>') +
      NOTE
    );
  }

  function moveCard(m, list, applied, base) {
    var before = after(base, list, applied);
    var only = {};
    Object.keys(applied).forEach(function (k) {
      only[k] = applied[k];
    });
    only[m.id] = !applied[m.id];
    var then = after(base, list, only);
    var on = !!applied[m.id];
    // Read left to right as time: the world without this move, then with it.
    var a = on ? then : before;
    var b = on ? before : then;
    var line = function (name, x, y, unit) {
      return (
        "<tr><td>" +
        name +
        '</td><td class="n">' +
        (unit === "rm" ? rm(x) : fmt(x)) +
        '</td><td class="n"><b>' +
        (unit === "rm" ? rm(y) : fmt(y)) +
        '</b></td><td class="n">' +
        (y === x ? "" : signed(y - x, unit)) +
        "</td></tr>"
      );
    };
    return (
      '<button data-agent="1" style="' +
      BACK +
      '">← All moves</button><h2>' +
      esc(m.title) +
      '</h2><p class="sub">' +
      esc(m.why) +
      "</p>" +
      '<table><tr><th>What if</th><th class="n">Before</th><th class="n">After</th><th class="n"></th></tr>' +
      line("Gaps", a.gaps, b.gaps) +
      line("RM a month", a.cost, b.cost, "rm") +
      line("Likely to stall", a.stall, b.stall) +
      "</table>" +
      '<table style="margin-top:10px">' +
      m.rows
        .map(function (r) {
          return (
            "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"
          );
        })
        .join("") +
      "</table>" +
      (m.people.length
        ? '<table style="margin-top:10px"><tr><th>Who</th><th class="n">Week spare</th><th class="n">After</th></tr>' +
          m.people
            .map(function (p) {
              return (
                "<tr><td>" +
                esc(p.name) +
                '<br><span style="color:var(--muted);font-size:11px">' +
                esc(p.says) +
                '</span></td><td class="n">' +
                p.before +
                '%</td><td class="n"><b>' +
                p.after +
                "%</b></td></tr>"
              );
            })
            .join("") +
          "</table>"
        : "") +
      (m.closes.length
        ? '<table style="margin-top:10px"><tr><th>Gaps it closes</th></tr>' +
          m.closes
            .map(function (s) {
              return "<tr><td>" + esc(s) + "</td></tr>";
            })
            .join("") +
          "</table>"
        : "") +
      '<p style="margin:12px 0 0"><button data-apply="' +
      esc(m.id) +
      '"' +
      (on ? ' aria-pressed="true"' : "") +
      ">" +
      (on ? "Applied: undo" : "Apply to the city") +
      "</button></p>" +
      '<p class="sub" style="margin:10px 0 0">Assumed: ' +
      m.assumes.map(esc).join(" ") +
      "</p>" +
      NOTE
    );
  }

  return { moves: moves, after: after, listCard: listCard, moveCard: moveCard };
})();
