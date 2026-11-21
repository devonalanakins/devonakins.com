export const FIELDNOTES = Object.freeze({
  "/fieldnotes/periodic-signals/": {
    kind: "Mathematics",
    title: "How two sine waves draw a curve",
    summary: "What makes a Lissajous curve close, and what changes when you adjust the frequency ratio.",
    body: [
      ["Start with two coordinates",
        "Pick a time t. Calculate x = sin(at) and y = sin(bt + π/2). Plot that pair as a point. Now let t run from 0 to 2π. The horizontal coordinate completes a cycles while the vertical coordinate completes b. The π/2 phase shift makes the vertical coordinate start at its maximum."],
      ["Find the repeat",
        "If a and b are positive integers, both sines return to their starting phase at t = 2π. More precisely, let g be the greatest common divisor of a and b. The common period is 2π/g because a/g and b/g are integers with no common factor. The pairs (2, 3) and (4, 6) trace the same locus on this interval, with the second pair tracing it twice."],
      ["Try the simplest case",
        "With a = b = 1, y = cos(t), so x² + y² = 1. The curve is a circle before drawing scales are applied. The browser plot uses independent horizontal and vertical scales, so that case looks like an ellipse on screen. Hold a at 1 and increase b to see the vertical coordinate oscillate more often."],
      ["Read the plot at the right level",
        "The sketch connects 301 sampled points with line segments. The sine functions define a continuous curve. The polyline approximates that curve and its display scaling makes the geometry fit the plot. The inputs are mathematical parameters. The plot contains no recorded signal or experimental measurement."]
    ],
    links: [
      ["/research/", "Try the interactive sketch"],
      ["https://mathworld.wolfram.com/LissajousCurve.html", "Wolfram MathWorld: Lissajous Curve"]
    ]
  },
  "/fieldnotes/public-evidence/": {
    kind: "Engineering",
    title: "What public engineering evidence proves",
    summary: "How to read source, checks, and a running deployment as three separate pieces of evidence.",
    body: [
      ["Start with a concrete claim",
        "Take the claim that a podcast page is available. In the source tree, look for how the build chooses its public routes and how the Worker serves them. A route template proves there is code to render a page. Build it with the release configuration and check the generated response before making a claim about the running service."],
      ["Read what the check measures",
        "A green HTTP check establishes that a request returned the expected status. An accessibility scan can catch a subset of markup and contrast failures. A keyboard walkthrough tests whether a person can actually reach and use the controls. Record the commit, configuration, and scenario so someone else can reproduce the result."],
      ["Verify the deployed version",
        "The deployment has its own evidence: the release identifier supplied by the public Worker, the route response, and behavior in the actual browser. Compare the reported commit with the reviewed release, then try the public task again. A pull request timestamp records a GitHub event. It answers a different question from whether the feature is live."]
    ],
    links: [
      ["/activity/", "See dated public activity"],
      ["https://github.com/devonalanakins/devonakins.com", "Inspect this website’s source"]
    ]
  }
});
