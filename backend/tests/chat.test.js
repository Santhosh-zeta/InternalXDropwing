/**
 * Chat: REST authorisation + single persist/emit, and real Socket.IO rooms.
 * dd = Dropwing (target), fx = Fenixa (other venture).
 */
const http = require('http');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const { setup, buildApp } = require('./helpers/app');

let t;
let c;
const A = {};

beforeAll(async () => {
  t = await setup();
  c = t.ctx;
  for (const k of ['l1', 'l2', 'dd.l3', 'dd.l5', 'dd.l7', 'dd.l7b', 'dd.client', 'fx.l5', 'fx.l7', 'client.other']) A[k] = await t.as(k);
});
afterAll(() => t.close());

const count = async () => (await t.pool.query('SELECT COUNT(*)::int AS n FROM messages')).rows[0].n;
const contents = (res) => res.body.data.map((m) => m.content);

describe('REST reads', () => {
  test.each([
    ['l1', 1, 200], ['l2', 1, 200], ['dd.l3', 1, 200], ['dd.l7', 1, 200],
    ['fx.l5', 1, 403], ['fx.l7', 1, 403], ['dd.client', 1, 403], ['client.other', 1, 403],
  ])('%s reads venture channel %i -> %i', async (who, v, status) => {
    expect((await A[who].get(`/api/chat/messages?ventureId=${c.ventureId.dd}`)).status).toBe(status);
  });

  test('global channel is for internal staff, not clients', async () => {
    for (const who of ['l1', 'dd.l7', 'fx.l7']) expect((await A[who].get('/api/chat/messages?ventureId=global')).status).toBe(200);
    for (const who of ['dd.client', 'client.other']) expect((await A[who].get('/api/chat/messages?ventureId=global')).status).toBe(403);
  });

  test('venture channel returns only that venture; global only global', async () => {
    const dd = await A['dd.l7'].get(`/api/chat/messages?ventureId=${c.ventureId.dd}`);
    expect(contents(dd).every((x) => x.includes('Dropwing'))).toBe(true);
    const g = await A['dd.l7'].get('/api/chat/messages?ventureId=global');
    expect(contents(g)).toEqual(expect.arrayContaining(['[demo] Welcome to Global HQ']));
    expect(contents(g).some((x) => x.includes('team channel'))).toBe(false);
  });

  test('DMs: participants only, even for global users', async () => {
    const dm = (who, other) => A[who].get(`/api/chat/messages?receiverId=${c.users[other]}`);
    expect(contents(await dm('dd.l5', 'dd.l7'))).toContain('[demo] private note to l7');
    expect(contents(await dm('dd.l7', 'dd.l5'))).toContain('[demo] private note to l7');
    // L1 reading "their" thread with dd.l7 sees nothing of the l5<->l7 conversation
    expect(contents(await dm('l1', 'dd.l7'))).toEqual([]);
    // an uninvolved colleague gets their own (empty) thread
    expect(contents(await A['dd.l7b'].get(`/api/chat/messages?receiverId=${c.users['dd.l5']}`))).toEqual([]);
    // cross-venture and client DMs are refused
    expect((await dm('fx.l5', 'dd.l7')).status).toBe(403);
    expect((await dm('dd.l7', 'fx.l7')).status).toBe(403);
    expect((await dm('dd.l7', 'dd.client')).status).toBe(403);
    expect((await dm('dd.client', 'dd.l7')).status).toBe(403);
    expect((await dm('dd.l7', 'l2')).status).toBe(200); // global users are reachable by everyone internal
  });

  test('malformed targets are rejected', async () => {
    expect((await A['dd.l7'].get('/api/chat/messages')).status).toBe(400);
    expect((await A['dd.l7'].get('/api/chat/messages?ventureId=1%20OR%201=1')).status).toBe(403);
    expect((await A['dd.l7'].get('/api/chat/messages?ventureId=1&receiverId=2')).status).toBe(400);
  });

  test('channels list matches the scope', async () => {
    const asL7 = (await A['dd.l7'].get('/api/chat/channels')).body.data;
    expect(asL7.ventures.map((v) => v.id)).toEqual([c.ventureId.dd]);
    expect(asL7.global).toBe(true);
    expect((await A.l1.get('/api/chat/channels')).body.data.ventures.length).toBe(4);
  });
});

describe('REST send: persist once, emit from the server, trust nothing from the body', () => {
  test('a venture message is stored once and emitted once to its room', async () => {
    const before = await count();
    t.io.emitted.length = 0;
    const res = await A['dd.l7'].post('/api/chat/messages').send({
      content: '  hello team ', ventureId: c.ventureId.dd, sender_id: c.users['dd.l3'], sender_name: 'The CEO',
    });
    expect(res.status).toBe(200);
    expect(await count()).toBe(before + 1);
    expect(res.body.data.sender_id).toBe(c.users['dd.l7']);
    expect(res.body.data.sender_name).toBe('Dropwing L7');
    expect(res.body.data.content).toBe('hello team');
    expect(t.io.emitted).toHaveLength(1);
    expect(t.io.emitted[0]).toMatchObject({ rooms: [`venture_${c.ventureId.dd}`], event: 'receive_message' });
    expect(t.io.emitted[0].payload.id).toBe(res.body.data.id);
  });

  test('DM goes to both participants only', async () => {
    t.io.emitted.length = 0;
    const res = await A['dd.l7'].post('/api/chat/messages').send({ content: 'psst', receiverId: c.users['dd.l5'] });
    expect(res.status).toBe(200);
    expect(t.io.emitted[0].rooms.sort()).toEqual([`dm_${c.users['dd.l5']}`, `dm_${c.users['dd.l7']}`].sort());
  });

  test('refused sends store and emit nothing', async () => {
    const before = await count();
    t.io.emitted.length = 0;
    const attempts = [
      ['fx.l5', { content: 'x', ventureId: c.ventureId.dd }, 403],
      ['dd.client', { content: 'x', ventureId: 'global' }, 403],
      ['dd.client', { content: 'x', receiverId: c.users['dd.l5'] }, 403],
      ['client.other', { content: 'x', ventureId: c.ventureId.dd }, 403],
      ['dd.l7', { content: 'x', receiverId: c.users['fx.l7'] }, 403],
      ['dd.l7', { content: 'x', receiverId: c.users['dd.l7'] }, 403], // yourself
      ['dd.l7', { content: 'x', ventureId: c.ventureId.dd, receiverId: c.users['dd.l5'] }, 400], // ambiguous
      ['dd.l7', { content: '   ', ventureId: c.ventureId.dd }, 400],
      ['dd.l7', { content: 'x'.repeat(5000), ventureId: c.ventureId.dd }, 400],
      ['dd.l7', { content: { $ne: 1 }, ventureId: c.ventureId.dd }, 400],
    ];
    for (const [who, body, status] of attempts) {
      const r = await A[who].post('/api/chat/messages').send(body);
      expect([who, r.status]).toEqual([who, status]);
    }
    expect(await count()).toBe(before);
    expect(t.io.emitted).toHaveLength(0);
  });

  test('global users may post into any venture and the global channel', async () => {
    expect((await A.l2.post('/api/chat/messages').send({ content: 'hi px', ventureId: c.ventureId.px })).status).toBe(200);
    expect((await A['dd.l7'].post('/api/chat/messages').send({ content: 'hi all', ventureId: 'global' })).status).toBe(200);
    expect(t.io.emitted.pop().rooms).toEqual(['global']);
  });
});

describe('Socket.IO rooms (real server)', () => {
  let server; let port; let io; const sockets = [];

  const open = (token) => new Promise((resolve, reject) => {
    const s = connect(`http://localhost:${port}`, { auth: { token }, transports: ['websocket'], reconnection: false });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
  const inbox = (s) => { const got = []; s.on('receive_message', (m) => got.push(m)); return got; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const emitAck = (s, ev, arg) => new Promise((resolve) => s.emit(ev, arg, resolve));

  beforeAll(async () => {
    const built = buildApp();
    server = http.createServer(built.app);
    io = new Server(server);
    require('../src/socket')(io);
    built.app.set('io', io);
    await new Promise((r) => server.listen(0, r));
    port = server.address().port;
    // The REST helpers in `t` talk to a different app; use this one for the emit path.
    t.rest = (key, method, url, body) => {
      const request = require('supertest');
      return request(built.app)[method](url).set('Authorization', `Bearer ${A[key].token}`).send(body);
    };
  });
  afterAll(async () => {
    sockets.forEach((s) => s.close());
    io.close();
    await new Promise((r) => server.close(r));
  });

  test('rejects unauthenticated connections', async () => {
    await expect(open('not-a-token')).rejects.toBeTruthy();
  });

  test('join_channel validates the room against scope', async () => {
    const s = await open(A['dd.l7'].token);
    const ok = (room) => emitAck(s, 'join_channel', room).then((r) => r.ok);
    expect(await ok(`venture_${c.ventureId.dd}`)).toBe(true);
    expect(await ok('global')).toBe(true);
    expect(await ok(`dm_${c.users['dd.l7']}`)).toBe(true);
    expect(await ok(`venture_${c.ventureId.fx}`)).toBe(false);
    expect(await ok(`dm_${c.users['dd.l5']}`)).toBe(false);
    expect(await ok('venture_1 OR 1=1')).toBe(false);
    expect(await ok({ channelId: `venture_${c.ventureId.fx}` })).toBe(false);
    expect(await ok(null)).toBe(false);

    const client = await open(A['dd.client'].token);
    for (const room of ['global', `venture_${c.ventureId.dd}`, `dm_${c.users['dd.client']}`]) {
      expect((await emitAck(client, 'join_channel', room)).ok).toBe(false);
    }
    const g = await open(A.l2.token);
    expect((await emitAck(g, 'join_channel', `venture_${c.ventureId.px}`)).ok).toBe(true);
  });

  test('messages reach exactly the members of the room', async () => {
    const [ddStaff, fxStaff, ddClient, ddMgr, md] = await Promise.all(
      ['dd.l7', 'fx.l7', 'dd.client', 'dd.l5', 'l2'].map((k) => open(A[k].token)));
    const got = { ddStaff: inbox(ddStaff), fxStaff: inbox(fxStaff), ddClient: inbox(ddClient), ddMgr: inbox(ddMgr), md: inbox(md) };
    // an attacker tries every trick to listen in
    await emitAck(fxStaff, 'join_channel', `venture_${c.ventureId.dd}`);
    await emitAck(ddClient, 'join_channel', `venture_${c.ventureId.dd}`);
    await emitAck(fxStaff, 'join_channel', `dm_${c.users['dd.l5']}`);

    expect((await t.rest('dd.l5', 'post', '/api/chat/messages', { content: 'venture only', ventureId: c.ventureId.dd })).status).toBe(200);
    expect((await t.rest('dd.l5', 'post', '/api/chat/messages', { content: 'dm to l7', receiverId: c.users['dd.l7'] })).status).toBe(200);
    await wait(300);

    const texts = (k) => got[k].map((m) => m.content);
    expect(texts('ddStaff')).toEqual(expect.arrayContaining(['venture only', 'dm to l7']));
    expect(texts('ddMgr')).toEqual(expect.arrayContaining(['venture only', 'dm to l7'])); // sender gets own DM echo
    expect(texts('md')).toContain('venture only');                // global users hear every venture
    expect(texts('md')).not.toContain('dm to l7');                // ...but not other people's DMs
    expect(texts('fxStaff')).toEqual([]);
    expect(texts('ddClient')).toEqual([]);
    const m = got.ddStaff.find((x) => x.content === 'venture only');
    expect(m).toMatchObject({ sender_name: 'Dropwing L5', ventureId: c.ventureId.dd });
  });

  test('socket send_message goes through the same validation, once', async () => {
    const before = await count();
    const fx = await open(A['fx.l7'].token);
    const refused = await emitAck(fx, 'send_message', { content: 'sneak', ventureId: c.ventureId.dd });
    expect(refused.success).toBe(false);
    expect(await count()).toBe(before);

    const dd = await open(A['dd.l7'].token);
    const mine = inbox(dd);
    const okAck = await emitAck(dd, 'send_message', { content: 'via socket', ventureId: c.ventureId.dd, sender_id: 1, sender_name: 'spoof' });
    expect(okAck.success).toBe(true);
    await wait(200);
    expect(await count()).toBe(before + 1);
    expect(mine.filter((x) => x.content === 'via socket')).toHaveLength(1);
    expect(okAck.data.sender_id).toBe(c.users['dd.l7']);
  });

  test('typing is relayed only inside an allowed channel', async () => {
    const [typist, mate, outsider] = await Promise.all(['dd.l7', 'dd.l5', 'fx.l7'].map((k) => open(A[k].token)));
    const heard = (s) => { const got = []; s.on('user_typing', (p) => got.push(p)); return got; };
    const mateHears = heard(mate); const outsiderHears = heard(outsider);
    typist.emit('typing', { ventureId: c.ventureId.dd });
    await wait(300);
    expect(mateHears).toEqual([{ userId: c.users['dd.l7'], ventureId: c.ventureId.dd }]);
    expect(outsiderHears).toEqual([]);

    const outsiderTyper = outsider; // fx.l7 trying to type into dd
    outsiderTyper.emit('typing', { ventureId: c.ventureId.dd });
    await wait(300);
    expect(mateHears).toHaveLength(1);
  });

  test('revoking sessions / logging out disconnects open sockets (and no other user\'s)', async () => {
    const { revokeAllSessionsForUser, revokeSession } = require('../src/services/session.service');
    const closed = (s) => new Promise((r) => s.on('disconnect', r));
    const a = await open(A['dd.l7'].token);
    const bystander = await open(A['dd.l5'].token);
    const done = closed(a);
    await revokeAllSessionsForUser(c.users['dd.l7']);
    await Promise.race([done, wait(2000).then(() => { throw new Error('socket still open'); })]);
    expect(a.connected).toBe(false);
    expect(bystander.connected).toBe(true);
    await expect(open(A['dd.l7'].token)).rejects.toBeTruthy(); // session row is gone

    const out = closed(bystander);
    await revokeSession(A['dd.l5'].token);
    await Promise.race([out, wait(2000).then(() => { throw new Error('socket still open'); })]);
    expect(bystander.connected).toBe(false);
  });
});
