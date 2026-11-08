import { renderV5Atlas } from "./atlas-markup.mjs";
import { renderPublicGraphHistory } from "./public-graph-view.mjs";
import { publishV5Links } from "./public-routes.mjs";
const BEGIN = "<!-- V5_FIELD_BEGIN -->",
  END = "<!-- V5_FIELD_END -->";
/** Re-render only a compiled, explicitly published field template. No provider reads. */
export function renderPublishedField(template, requestedDate, now) {
  if (
    !template.includes('data-v5-signal-mode="released-v5"') ||
    template.split(BEGIN).length !== 2 ||
    template.split(END).length !== 2
  )
    return null;
  const start = template.indexOf(BEGIN),
    end = template.indexOf(END);
  if (end < start) return null;
  const options = { requestedDate, now };
  return (
    template.slice(0, start + BEGIN.length) +
    publishV5Links(renderV5Atlas(options) + renderPublicGraphHistory(options)) +
    template.slice(end)
  );
}
