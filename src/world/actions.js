import { catalog } from "./catalog.js";
export function editWorld(data, command) {
  const before = structuredClone(data.layout);
  let result = true;
  if (command.type === "undo") {
    const previous = data.layoutHistory.pop();
    if (previous) data.layout = previous;
    return Boolean(previous);
  }
  const item = data.layout.find((x) => x.cell === command.cell);
  if (command.type === "place") {
    if (item || !catalog.some((x) => x.id === command.id)) return false;
    const used = data.layout.filter((x) => x.id === command.id).length;
    if ((data.inventory[command.id] || 0) <= used) return false;
    data.layout.push({ cell: command.cell, id: command.id, rotation: 0 });
  } else if (command.type === "move") {
    if (
      !item ||
      data.layout.some((x) => x.cell === command.to) ||
      command.expectedId !== item.id
    )
      return false;
    item.cell = command.to;
  } else if (command.type === "rotate") {
    if (!item) return false;
    item.rotation = (item.rotation + 1) % 4;
  } else if (command.type === "remove") {
    if (!item) return false;
    data.layout = data.layout.filter((x) => x !== item);
  } else result = false;
  if (result) data.layoutHistory = [...data.layoutHistory, before].slice(-10);
  return result;
}
