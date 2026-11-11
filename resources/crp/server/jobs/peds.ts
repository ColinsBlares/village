import * as mint from 'mint-server';

interface Npc {
  model: string;
  x: number;
  y: number;
  z: number;
  h: number;
  scenario?: string;
}

const NPCS: Npc[] = [
  { model: 'a_m_m_hillbilly_01', x: 541.69775390625, y: -192.27578735351562, z: 54.48133850097656, h: 38.72, scenario: 'WORLD_HUMAN_AA_SMOKE' },
  { model: 'a_m_m_hillbilly_01', x: 488.8618469238281, y: -1318.2044677734375, z: 29.219741821289062, h: 290.9831237792969, scenario: 'WORLD_HUMAN_SMOKING' },
  { model: 'a_m_m_hillbilly_01', x: -229.68690490722656, y: -1377.2591552734375, z: 31.258243560791016, h: 212.7614288330078, scenario: 'WORLD_HUMAN_AA_COFFEE' },
  { model: 's_m_m_cntrybar_01', x: 905.0872802734375, y: -1575.5552978515625, z: 30.81341552734375, h: 45.43087387084961 },
  { model: 'u_m_m_promourn_01', x: -629.31494140625, y: -1635.0389404296875, z: 25.974966049194336, h: 201.21652221679688 },
  { model: 's_m_y_construct_02', x: 2568.329833984375, y: 2719.28857421875, z: 42.92911148071289, h: 246.8917236328125 },
  { model: 'mp_m_counterfeit_01', x: -567.8530883789062, y: 5254.45556640625, z: 70.46736907958984, h: 146.89959716796875 },
  { model: 'a_m_o_genstreet_01', x: 436.4219665527344, y: -645.994873046875, z: 28.74165153503418, h: 79.92713928222656, scenario: 'WORLD_HUMAN_AA_COFFEE' },
  { model: 'a_m_m_hasjew_01', x: 894.924560546875, y: -179.1186065673828, z: 74.70025634765625, h: 238.2574462890625, scenario: 'WORLD_HUMAN_STAND_MOBILE_UPRIGHT' },
  { model: 'cs_old_man2', x: -1593.1, y: 5202.9, z: 4.3, h: 294.5, scenario: 'WORLD_HUMAN_AA_SMOKE' },
  { model: 'cs_old_man2', x: 712.6, y: 4099.5, z: 35.8, h: 0, scenario: 'WORLD_HUMAN_AA_SMOKE' },
  { model: 'cs_old_man2', x: -1633.6, y: -1120.9, z: 2.4, h: 224.7, scenario: 'WORLD_HUMAN_AA_SMOKE' },
  { model: 'cs_old_man2', x: -426.5, y: 6355.8, z: 13.3, h: 33.14, scenario: 'WORLD_HUMAN_AA_SMOKE' },
];

export function installJobPeds(): void {
  for (const npc of NPCS) {
    const ped = new mint.Ped(
      npc.model,
      new mint.Vector3(npc.x, npc.y, npc.z),
      new mint.Vector3(0, 0, npc.h * (Math.PI / 180)),
      80,
      true,
      0,
      true,
    );
    ped.frozen = true;
    if (npc.scenario) ped.setStreamSyncedMeta('crp:scenario', npc.scenario);
  }
}
