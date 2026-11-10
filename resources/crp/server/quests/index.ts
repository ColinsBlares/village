import * as mint from 'mint-server';
import { table } from '../core/db.js';
import { getSession, type DbRow } from '../player/session.js';
import { cef } from '../ui/send.js';
import { notifyError, notifyInfo, notifySuccess } from '../ui/notify.js';
import { addCash } from '../world/money.js';

interface GraphNode {
  id: string;
  type: string;
  data?: Record<string, unknown>;
}

interface Graph {
  nodes: GraphNode[];
  edges: { source: string; target: string; sourceHandle?: string }[];
}

const quests = new Map<number, DbRow>();
const byKey = new Map<string, DbRow>();
const spots = new Map<number, { questId: number; x: number; y: number; z: number; radius: number }>();
const dialogShown = new Set<number>();

function parseGraph(raw: unknown): Graph {
  let graph: Graph = { nodes: [], edges: [] };
  if (raw && typeof raw === 'object') graph = raw as Graph;
  else if (typeof raw === 'string') {
    try {
      graph = JSON.parse(raw) as Graph;
    } catch {
      graph = { nodes: [], edges: [] };
    }
  }
  return { nodes: graph.nodes ?? [], edges: graph.edges ?? [] };
}

function nodeOf(graph: Graph, id: string): GraphNode | null {
  return graph.nodes.find((node) => node.id === id) ?? null;
}

function nextNode(graph: Graph, id: string, handle = 'exec'): GraphNode | null {
  const edge = graph.edges.find((item) => item.source === id && (item.sourceHandle || 'exec') === handle);
  return edge ? nodeOf(graph, edge.target) : null;
}

function text(data: Record<string, unknown> | undefined, key: string, fallback = ''): string {
  const value = data?.[key];
  return typeof value === 'string' && value ? value : fallback;
}

function choices(data: Record<string, unknown> | undefined): { handle: string; text: string }[] {
  const list: { handle: string; text: string }[] = [];
  if (data?.choice1) list.push({ handle: 'c1', text: String(data.choice1) });
  if (data?.choice2) list.push({ handle: 'c2', text: String(data.choice2) });
  if (data?.choice3) list.push({ handle: 'c3', text: String(data.choice3) });
  if (!list.length) list.push({ handle: 'exec', text: 'Продолжить' });
  return list;
}

function openDialog(player: mint.Player, quest: DbRow, data: Record<string, unknown>): void {
  const lines = String(data.dialog || data.text || '').split('|').map((line) => line.trim()).filter(Boolean);
  cef(player, `mp.event.call('questDialog.open', ${JSON.stringify({
    questId: Number(quest.id),
    npcName: text(data, 'npcName', 'NPC'),
    lines: lines.length ? lines : ['...'],
    choices: choices(data),
  })});`);
}

async function rowsOf(characterId: number): Promise<DbRow[]> {
  return (await table('CharacterQuest').findAll({ where: { characterId } })) as DbRow[];
}

function logOf(rows: DbRow[]): { active: unknown[]; done: unknown[] } {
  const active: unknown[] = [];
  const done: unknown[] = [];
  for (const row of rows) {
    const quest = quests.get(Number(row.questId));
    if (!quest) continue;
    const graph = parseGraph(quest.graph);
    const node = nodeOf(graph, String(row.nodeId ?? ''));
    const item = {
      key: quest.key,
      name: quest.name,
      tracked: !!row.tracked,
      objective: text(node?.data, 'objective', String(quest.description ?? '')),
    };
    if (row.status === 'active') active.push(item);
    else if (row.status === 'completed') done.push(item);
  }
  return { active, done };
}

function openLog(player: mint.Player, rows: DbRow[]): void {
  cef(player, `mp.event.call('questLog.open', ${JSON.stringify(logOf(rows))});`);
}

async function run(player: mint.Player, row: DbRow, quest: DbRow, node: GraphNode | null, steps = 0): Promise<void> {
  if (!node || steps > 12 || !player.valid) return;
  const graph = parseGraph(quest.graph);
  const data = node.data ?? {};
  row.nodeId = node.id;
  if (node.type === 'start' || node.type === 'mapMarker' || node.type === 'notify') {
    if (node.type === 'notify') notifyInfo(player, text(data, 'text', String(quest.name)), text(data, 'header', String(quest.name)));
    if (node.type === 'mapMarker') {
      mint.emitClient(player, 'crp:waypoint', Number(data.x) || 0, Number(data.y) || 0);
    }
    await row.save();
    await run(player, row, quest, nextNode(graph, node.id), steps + 1);
    return;
  }
  if (node.type === 'giveCash') {
    const amount = Math.trunc(Number(data.amount) || 0);
    if (amount > 0) await addCash(player, amount);
    await row.save();
    await run(player, row, quest, nextNode(graph, node.id), steps + 1);
    return;
  }
  if (node.type === 'checkpoint' || node.type === 'talkNpc') {
    const id = Number(getSession(player).character?.id) || 0;
    spots.set(id, {
      questId: Number(quest.id),
      x: Number(data.x) || 0,
      y: Number(data.y) || 0,
      z: Number(data.z) || 0,
      radius: Number(data.radius) || (node.type === 'talkNpc' ? 2.5 : 3),
    });
    mint.emitClient(player, 'crp:waypoint', Number(data.x) || 0, Number(data.y) || 0);
    notifyInfo(player, text(data, 'objective', 'Идите к точке'), String(quest.name));
    await row.save();
    return;
  }
  if (node.type === 'wait') {
    await row.save();
    notifyInfo(player, text(data, 'objective', 'Выполните условие'), String(quest.name));
    return;
  }
  if (node.type === 'end') {
    row.status = 'completed';
    row.tracked = false;
    spots.delete(Number(getSession(player).character?.id) || 0);
    await row.save();
    notifySuccess(player, 'Квест завершён', String(quest.name));
    return;
  }
  await row.save();
  await run(player, row, quest, nextNode(graph, node.id), steps + 1);
}

async function begin(player: mint.Player, quest: DbRow, tracked: boolean): Promise<void> {
  const character = getSession(player).character;
  if (!character || !quest.enabled) return;
  const rows = await rowsOf(Number(character.id));
  if (rows.some((row) => Number(row.questId) === Number(quest.id) && row.status === 'active')) return;
  if (!quest.repeatable && rows.some((row) => Number(row.questId) === Number(quest.id) && row.status === 'completed')) return;
  const graph = parseGraph(quest.graph);
  const start = graph.nodes.find((node) => node.type === 'start');
  if (!start) return;
  const created = (await table('CharacterQuest').create({
    characterId: character.id,
    questId: quest.id,
    status: 'active',
    nodeId: start.id,
    tracked,
  })) as DbRow;
  if (tracked) {
    for (const row of rows) {
      if (!row.tracked) continue;
      row.tracked = false;
      await row.save();
    }
  }
  await run(player, created, quest, nextNode(graph, start.id) ?? start, 0);
}

export async function loadQuests(): Promise<number> {
  const rows = (await table('Quest').findAll()) as DbRow[];
  quests.clear();
  byKey.clear();
  for (const row of rows) {
    quests.set(Number(row.id), row);
    byKey.set(String(row.key), row);
  }
  return rows.length;
}

export async function resumeQuests(player: mint.Player): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = await rowsOf(Number(character.id));
  for (const row of rows) {
    if (row.status !== 'active') continue;
    const quest = quests.get(Number(row.questId));
    if (!quest) continue;
    const graph = parseGraph(quest.graph);
    const node = nodeOf(graph, String(row.nodeId ?? '')) ?? graph.nodes.find((item) => item.type === 'start') ?? null;
    await run(player, row, quest, node, 0);
  }
  const fresh = (Number(character.minutes) || 0) < 2 && !rows.length;
  if (!fresh) return;
  for (const quest of quests.values()) {
    if (quest.enabled && (quest.autoStart === 'onCreate' || quest.autoStart === 'ready')) await begin(player, quest, true);
  }
}

export async function signalQuest(player: mint.Player, name: string): Promise<void> {
  const character = getSession(player).character;
  if (!character) return;
  const rows = await rowsOf(Number(character.id));
  for (const row of rows) {
    if (row.status !== 'active') continue;
    const quest = quests.get(Number(row.questId));
    if (!quest) continue;
    const graph = parseGraph(quest.graph);
    const node = nodeOf(graph, String(row.nodeId ?? ''));
    if (!node || node.type !== 'wait' || text(node.data, 'signal') !== name) continue;
    await run(player, row, quest, nextNode(graph, node.id), 0);
  }
}

export function installQuests(): void {
  mint.onClient('crp:quest:log', async (player) => {
    const character = getSession(player).character;
    if (!character) return;
    openLog(player, await rowsOf(Number(character.id)));
  });
  mint.onClient('crp:quest:track', async (player, key) => {
    const quest = byKey.get(String(key ?? ''));
    const character = getSession(player).character;
    if (!quest || !character) return;
    const rows = await rowsOf(Number(character.id));
    for (const row of rows) {
      row.tracked = Number(row.questId) === Number(quest.id) && row.status === 'active';
      await row.save();
    }
    openLog(player, rows);
  });
  mint.onClient('crp:quest:abandon', async (player, key) => {
    const quest = byKey.get(String(key ?? ''));
    const character = getSession(player).character;
    if (!quest || !character) return;
    const rows = await rowsOf(Number(character.id));
    const row = rows.find((item) => Number(item.questId) === Number(quest.id) && item.status === 'active');
    if (!row) return;
    row.status = 'failed';
    row.tracked = false;
    await row.save();
    spots.delete(Number(character.id));
    notifyError(player, 'Квест провален', String(quest.name));
    openLog(player, rows);
  });
  mint.onClient('crp:quest:choice', async (player, rawId, handle) => {
    const character = getSession(player).character;
    const questId = Number(rawId) || 0;
    const quest = quests.get(questId);
    if (!character || !quest) return;
    const rows = await rowsOf(Number(character.id));
    const row = rows.find((item) => Number(item.questId) === questId && item.status === 'active');
    if (!row) return;
    const graph = parseGraph(quest.graph);
    const node = nodeOf(graph, String(row.nodeId ?? ''));
    if (!node || node.type !== 'talkNpc') return;
    const data = node.data ?? {};
    const picked = String(handle ?? '');
    if (!choices(data).some((choice) => choice.handle === picked)) return;
    const radius = Number(data.radius) || 2.5;
    if (player.pos.distanceTo(new mint.Vector3(Number(data.x) || 0, Number(data.y) || 0, Number(data.z) || 0)) > radius + 2) return;
    dialogShown.delete(Number(character.id));
    spots.delete(Number(character.id));
    cef(player, `mp.event.call('questDialog.hide');`);
    await run(player, row, quest, nextNode(graph, node.id, picked), 0);
  });
  mint.onClient('crp:quest:reach', async (player, rawId) => {
    const character = getSession(player).character;
    const spot = spots.get(Number(character?.id) || 0);
    if (!character || !spot || spot.questId !== Number(rawId)) return;
    if (player.pos.distanceTo(new mint.Vector3(spot.x, spot.y, spot.z)) > spot.radius + 2) return;
    const quest = quests.get(spot.questId);
    if (!quest) return;
    const rows = await rowsOf(Number(character.id));
    const row = rows.find((item) => Number(item.questId) === spot.questId && item.status === 'active');
    if (!row) return;
    const graph = parseGraph(quest.graph);
    const node = nodeOf(graph, String(row.nodeId ?? ''));
    if (!node) return;
    spots.delete(Number(character.id));
    await run(player, row, quest, nextNode(graph, node.id), 0);
  });
  mint.setInterval(() => {
    for (const player of mint.Player.all) {
      if (!player.valid) continue;
      const characterId = Number(getSession(player).character?.id) || 0;
      const spot = spots.get(characterId);
      if (!spot) continue;
      const away = player.pos.distanceTo(new mint.Vector3(spot.x, spot.y, spot.z));
      if (away > spot.radius) {
        dialogShown.delete(characterId);
        continue;
      }
      const quest = quests.get(spot.questId);
      const character = getSession(player).character;
      if (!quest || !character) continue;
      void rowsOf(Number(character.id)).then(async (rows) => {
        const row = rows.find((item) => Number(item.questId) === spot.questId && item.status === 'active');
        if (!row) return;
        const graph = parseGraph(quest.graph);
        const node = nodeOf(graph, String(row.nodeId ?? ''));
        if (!node) return;
        if (node.type === 'talkNpc') {
          if (dialogShown.has(characterId)) return;
          dialogShown.add(characterId);
          openDialog(player, quest, node.data ?? {});
          return;
        }
        if (node.type !== 'checkpoint') return;
        spots.delete(characterId);
        await run(player, row, quest, nextNode(graph, node.id), 0);
      });
    }
  }, 1000);
}
