import type { Audience, Employee, Post, Response, Role, Store } from '../types';
import { resolvePostAudience } from '../lib/audience';
import { isActionRequired } from '../lib/status';
import { addHours, fromPacificLocal } from '../lib/time';

// Deterministic seed (SPEC §7). No randomness: every value is a rule on the person's index,
// so two resets produce identical data.

export const STORES: Store[] = [
  { id: 's1', name: 'Downtown Seattle' },
  { id: 's2', name: 'Northgate' },
  { id: 's3', name: 'Bellevue' },
  { id: 's4', name: 'Renton' },
  { id: 's5', name: 'Tacoma' },
];

// Employee g (0..199) is index i = g % 40 at home store k = floor(g / 40). id = e001..e200.
const idOf = (k: number, i: number) => `e${String(k * 40 + i + 1).padStart(3, '0')}`;

export const MICHAEL_ID = 'e000';
export const RACHEL_ID = idOf(1, 0);   // Northgate store manager
export const ALEX_ID = idOf(1, 4);     // Northgate associate
export const MALVIKA_ID = idOf(3, 4);  // Renton associate
export const MULTI_NORTHGATE_BELLEVUE_ID = idOf(1, 10);

const FIXED_NAMES: Record<string, string> = {
  [RACHEL_ID]: 'Rachel Kim', [ALEX_ID]: 'Alex Rivera', [MALVIKA_ID]: 'Malvika Sanghvi',
};
// Second stores for the 3 multi-store people.
const SECOND_STORE: Record<string, string> = {
  [MULTI_NORTHGATE_BELLEVUE_ID]: 's3', // Northgate + Bellevue
  [idOf(0, 11)]: 's5',                 // Downtown Seattle + Tacoma
  [idOf(2, 12)]: 's4',                 // Bellevue + Renton
};
const ON_LEAVE_INDEX = 39; // one person per store, including one at Northgate

const FIRST = [
  'Jordan', 'Priya', 'Marcus', 'Sofia', 'Daniel', 'Aisha', 'Kevin', 'Lena', 'Omar', 'Grace',
  'Tyler', 'Mei', 'Carlos', 'Hannah', 'Andre', 'Nina', 'Ethan', 'Fatima', 'Lucas', 'Chloe',
  'Diego', 'Amara', 'Ryan', 'Yuki', 'Jamal', 'Elena', 'Noah', 'Zara', 'Samuel', 'Leila',
  'Brandon', 'Ivy', 'Mateo', 'Rosa', 'Hassan', 'Megan', 'Victor', 'Tara', 'Isaac', 'Julia',
];
const LAST = [
  'Nguyen', 'Patel', 'Johnson', 'Garcia', 'Chen', 'Williams', 'Okafor', 'Martinez', 'Lee', 'Brown',
  'Hernandez', 'Singh', 'Davis', 'Lopez', 'Kowalski', 'Wilson', 'Tanaka', 'Anderson', 'Ali', 'Thomas',
  'Moore', 'Jackson', 'Park', 'Clark', 'Reyes',
];
// (i, k) → (FIRST[i], LAST[(i + 7k) % 25]) is one-to-one for k = 0..4, so names never repeat.
const nameOf = (k: number, i: number) => `${FIRST[i]} ${LAST[(i + 7 * k) % LAST.length]}`;
const roleOf = (i: number): Role => (i === 0 ? 'store_manager' : i <= 3 ? 'shift_lead' : 'associate');

const pt = fromPacificLocal;
const all = (storeIds: string[], roles: Role[] = []): Audience => ({ storeIds, roles, employeeIds: [] });

function buildEmployees(): Employee[] {
  const out: Employee[] = [{ id: MICHAEL_ID, name: 'Michael Torres', role: 'ops_manager', storeIds: [], onLeave: false }];
  STORES.forEach((store, k) => {
    for (let i = 0; i < 40; i++) {
      const id = idOf(k, i);
      out.push({
        id, name: FIXED_NAMES[id] ?? nameOf(k, i), role: roleOf(i),
        storeIds: SECOND_STORE[id] ? [store.id, SECOND_STORE[id]] : [store.id],
        onLeave: i === ON_LEAVE_INDEX,
      });
    }
  });
  return out;
}

function post(p: Omit<Post, 'updatedAt' | 'version'>): Post {
  return { ...p, updatedAt: p.createdAt, version: 1 };
}

function buildPosts(): Post[] {
  const renton = idOf(3, 0);
  return [
    post({
      id: 'p-ladder', title: 'New ladder safety procedure', category: 'Safety', authorId: MICHAEL_ID,
      summary: 'From Monday: use a spotter on ladders over 6 ft.',
      body: 'Starting Monday, everyone follows the same ladder procedure in every store. Keep three points of contact at all times: two hands and a foot, or two feet and a hand. Any ladder over 6 ft needs a spotter holding the base; if no one is free, wait. Before you climb, check the feet, rungs and locks. If a ladder is damaged, tag it "Do not use" right away and tell your shift lead so it can be replaced.',
      createdAt: pt('2026-10-26T09:00'), actAudience: all(STORES.map((s) => s.id)), fyiAudience: null,
      ackBy: pt('2026-10-27T09:00'),
    }),
    post({
      id: 'p-recall', title: 'Recall: SunSplash Kids Sunscreen 6 oz', category: 'Safety', authorId: MICHAEL_ID,
      summary: "Pull it from shelves by Friday 5 PM. Confirm you've read this.",
      body: 'The maker of SunSplash Kids Sunscreen 6 oz (all lot numbers) has issued a voluntary recall. By Friday at 5 PM, remove every unit from the sales floor, endcaps and back stock, bag it, and put it in the returns cage labeled "Recall: SunSplash". Customers who bring one back get a full refund without a receipt. Tap Acknowledge to confirm you\'ve read this.',
      createdAt: pt('2026-10-27T10:00'), actAudience: all(['s2', 's3'], ['associate', 'shift_lead']),
      fyiAudience: all(['s2'], ['store_manager']),
      ackBy: pt('2026-10-29T10:00'),
    }),
    post({
      id: 'p-returns', title: 'Updated return policy', category: 'Policy', authorId: RACHEL_ID,
      summary: 'From Nov 1, electronics returns need a receipt.',
      body: 'From November 1, returns of electronics (headphones, chargers, speakers, small appliances) need a receipt or an order number we can look up. Without one, offer an exchange or store credit at the lowest recent price. Everything else keeps the current 30-day policy. If a customer pushes back, call your shift lead.',
      createdAt: pt('2026-10-28T08:00'), actAudience: all(['s2']), fyiAudience: null,
      ackBy: pt('2026-10-29T08:00'),
    }),
    post({
      id: 'p-holiday', title: 'Holiday schedule requests due Nov 5', category: 'General', authorId: MICHAEL_ID,
      summary: 'Send your holiday availability to your store manager by Nov 5.',
      body: 'Holiday schedules for Thanksgiving week through New Year are being built now. Tell your store manager which days you can and can\'t work by November 5. Requests are handled in the order they come in.',
      createdAt: pt('2026-10-26T14:00'), actAudience: null, fyiAudience: all(STORES.map((s) => s.id)),
      ackBy: null,
    }),
    post({
      id: 'p-parking', title: 'Parking lot repaving Saturday: please use the rear lot', category: 'General', authorId: RACHEL_ID,
      summary: 'The front lot is closed Saturday; park in the rear lot.',
      body: 'The front parking lot is being repaved this Saturday from 6 AM to 6 PM. Please park in the rear lot and use the staff entrance. Customers will be directed around the building.',
      createdAt: pt('2026-10-27T15:00'), actAudience: null, fyiAudience: all(['s2']),
      ackBy: null,
    }),
    post({
      id: 'p-sales', title: 'Northgate hit 112% of the October sales goal. Thank you!', category: 'General', authorId: RACHEL_ID,
      summary: 'We beat our October goal by 12%. Thanks, everyone.',
      body: 'Northgate finished October at 112% of our sales goal, the best in the region. Thank you for the extra effort on the floor and in back stock. Pizza in the break room on Friday.',
      createdAt: pt('2026-10-27T09:00'), actAudience: null, fyiAudience: all(['s2']),
      ackBy: null,
    }),
    post({
      id: 'p-lunch', title: 'Renton team lunch Friday at 2 PM', category: 'General', authorId: renton,
      summary: 'Team lunch in the break room this Friday at 2 PM.',
      body: 'Join us for a team lunch in the break room this Friday at 2 PM. Food is on the store. Let your shift lead know about any dietary needs.',
      createdAt: pt('2026-10-27T12:00'), actAudience: null, fyiAudience: all(['s4']),
      ackBy: null,
    }),
  ];
}

// Ladder acknowledgment rate per home store (out of every 20 people by index), so Northgate is behind:
// Downtown Seattle 90%, Northgate 55%, Bellevue 85%, Renton 80%, Tacoma 70%.
const LADDER_ACK_OF_20 = [18, 11, 17, 16, 14];

function buildResponses(posts: Post[], employees: Employee[]): Response[] {
  const homeIndex = new Map<string, { k: number; i: number }>();
  STORES.forEach((_, k) => { for (let i = 0; i < 40; i++) homeIndex.set(idOf(k, i), { k, i }); });
  const out: Response[] = [];
  const add = (p: Post, employeeId: string, r: Omit<Response, 'postId' | 'employeeId' | 'version'>) =>
    out.push({ postId: p.id, employeeId, version: 1, ...r });

  for (const p of posts) {
    const { actIds, fyiIds } = resolvePostAudience(p, employees);
    for (const id of actIds) {
      const { k, i } = homeIndex.get(id)!;
      const e = employees.find((x) => x.id === id)!;
      if (e.onLeave) continue;
      if (p.id === 'p-ladder') {
        const acked = id === RACHEL_ID || (i % 20 < LADDER_ACK_OF_20[k] && id !== ALEX_ID && id !== MALVIKA_ID);
        if (acked) {
          const at = addHours(p.createdAt, 1 + ((i * 7) % 30)); // some before the Mon 1 PM reminder, most after
          add(p, id, { openedAt: at, acknowledgedAt: at });
        } else if (id === ALEX_ID || i % 3 === 0) {
          add(p, id, { openedAt: addHours(p.createdAt, 3) });
        }
      } else if (p.id === 'p-recall') {
        if (i % 4 !== 3 && id !== ALEX_ID) {
          const at = addHours(p.createdAt, 1 + ((i * 5) % 20));
          add(p, id, { openedAt: at, acknowledgedAt: at });
        } else if (id === ALEX_ID) {
          add(p, id, { openedAt: addHours(p.createdAt, 2) });
        }
      } else if (p.id === 'p-returns') {
        if (i === 0 || i % 8 === 1) {
          const at = addHours(p.createdAt, 0.5);
          add(p, id, { openedAt: at, acknowledgedAt: at });
        }
      }
    }
    if (isActionRequired(p)) continue;
    // FYI posts: about two thirds have opened them. Alex and Malvika open theirs when their feed renders.
    const postIndex = posts.indexOf(p);
    for (const id of fyiIds) {
      if (id === ALEX_ID || id === MALVIKA_ID) continue;
      const { i } = homeIndex.get(id)!;
      if ((i + postIndex) % 3 !== 0) add(p, id, { openedAt: addHours(p.createdAt, 1 + (i % 5)) });
    }
  }
  return out;
}

export function buildSeed(): { stores: Store[]; employees: Employee[]; posts: Post[]; responses: Response[] } {
  const employees = buildEmployees();
  const posts = buildPosts();
  return { stores: STORES.map((s) => ({ ...s })), employees, posts, responses: buildResponses(posts, employees) };
}
