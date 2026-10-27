// Domain model: joins outlines.json (names, weights, dates) with domains.json
// (objectives and topics) for whichever outline the target date falls under.
import { outlineFor } from './outline.js';

export const inOutline = (topic, outlineId) => topic.outline === 'both' || topic.outline === outlineId;

export function activeOutline(outlinesData, targetDate) {
  const list = outlinesData.outlines;
  return outlineFor(targetDate, list) || list[list.length - 1];
}

function other(outlinesData, outlineId) {
  return outlinesData.outlines.find((o) => o.id !== outlineId);
}

export function objectiveFor(obj, outlineId) {
  const label = outlineId === '2027' && obj.label2027 ? obj.label2027 : obj.label;
  const topics = obj.topics.filter((t) => inOutline(t, outlineId)).map((t) => t.name);
  // What the other outline has that this one does not, and vice versa.
  const changes = {
    added2027: obj.topics.filter((t) => t.outline === '2027').map((t) => t.name),
    dropped2027: obj.topics.filter((t) => t.outline === '2024').map((t) => t.name),
    relabelled: Boolean(obj.label2027)
  };
  return { id: obj.id, label, topics, changes, changeCount: changes.added2027.length + changes.dropped2027.length + (changes.relabelled ? 1 : 0) };
}

export function domainsFor(domainsData, outlinesData, outlineId) {
  const outline = outlinesData.outlines.find((o) => o.id === outlineId);
  const alt = other(outlinesData, outlineId);
  return domainsData.domains.map((d) => {
    const meta = outline.domains.find((x) => x.n === d.n);
    const altMeta = alt?.domains.find((x) => x.n === d.n);
    const objectives = d.objectives.map((o) => objectiveFor(o, outlineId));
    return {
      n: d.n,
      name: meta.name,
      weight: meta.weight,
      alt: altMeta ? { outlineId: alt.id, name: altMeta.name, weight: altMeta.weight } : null,
      objectives,
      changeCount: objectives.reduce((a, o) => a + o.changeCount, 0)
    };
  });
}

export const formatWeight = (w) => `${Number.isInteger(w) ? w : w.toFixed(1)}%`;
