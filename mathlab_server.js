// MathLab V6 - secure server for the published index.html (Node.js 20+).
// Keep OPENAI_API_KEY only in the hosting provider's environment variables.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const PORT = Number(process.env.PORT || 3000);
const htmlPath = path.join(__dirname, 'index.html');
const maxBytes = 8_000_000;
const calls = new Map();
function reply(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "frame-ancestors 'none'"
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function imageOK(v) {
  return typeof v === 'string' && v.length < 7_000_000 &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff'});
    return fs.createReadStream(htmlPath).on('error', () => res.destroy()).pipe(res);
  }
  if (req.method === 'GET' && pathname === '/health') return reply(res, 200, {ok:true, gradingEnabled:!!process.env.OPENAI_API_KEY});
  if (req.method !== 'POST' || pathname !== '/api/grade') return reply(res, 404, {error:'Ø§ÙØµÙØ­Ø© ØºÙØ± ÙÙØ¬ÙØ¯Ø©'});
  if (!process.env.OPENAI_API_KEY) return reply(res, 503, {error:'Ø§ÙØªØµØ­ÙØ­ Ø§ÙØ°ÙÙ ØºÙØ± ÙÙØ¹ÙÙ Ø¨Ø¹Ø¯ Ø¹ÙÙ Ø§ÙØ®Ø§Ø¯Ù'});
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  for (const [k,v] of calls) if (now - v.since > 60_000) calls.delete(k);
  const state = calls.get(ip) || {since:now, count:0};
  if (++state.count > 5) return reply(res, 429, {error:'Ø·ÙØ¨Ø§Øª ÙØ«ÙØ±Ø©Ø Ø§ÙØªØ¸Ø± Ø¯ÙÙÙØ© ÙØ­Ø§ÙÙ ÙØ±Ø© Ø«Ø§ÙÙØ©'});
  calls.set(ip, state);
  let raw = '';
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBytes) return reply(res, 413, {error:'Ø§ÙØµÙØ±Ø© ÙØ¨ÙØ±Ø© Ø¬Ø¯Ø§Ù'});
    }
  } catch { return reply(res, 400, {error:'ØªØ¹Ø°Ø± Ø§Ø³ØªÙØ§Ù Ø§ÙØµÙØ±Ø©'}); }
  let data;
  try { data = JSON.parse(raw); } catch { return reply(res, 400, {error:'Ø¨ÙØ§ÙØ§Øª ØºÙØ± ØµØ­ÙØ­Ø©'}); }
  if (!imageOK(data?.question) || !imageOK(data?.answer)) return reply(res, 400, {error:'Ø§Ø±ÙØ¹ ØµÙØ±Ø© ÙØ§Ø¶Ø­Ø© ÙÙØ³Ø¤Ø§Ù ÙØ§ÙØ­Ù'});
  const prompt = `Ø£ÙØª ÙØµØ­Ø­ ÙØ³Ø§Ø¹Ø¯ ÙØ±ÙØ§Ø¶ÙØ§Øª Ø§ÙØ«Ø§ÙØ« Ø§ÙÙØªÙØ³Ø· Ø§ÙØ¹Ø±Ø§ÙÙ. Ø§ÙØµÙØ±Ø© Ø§ÙØ£ÙÙÙ ÙÙØ³Ø¤Ø§Ù ÙØ§ÙØ«Ø§ÙÙØ© ÙØ­Ù Ø§ÙØ·Ø§ÙØ¨. Ø±Ø§Ø¬Ø¹ ÙÙ Ø®Ø·ÙØ©Ø ÙÙØ§ ØªØ®ÙÙ ÙØµØ§Ù ØºÙØ± ÙØ§Ø¶Ø­ Ø£Ù Ø®Ø·ÙØ§Øª ØºÙØ± ÙÙØ¬ÙØ¯Ø©. Ø§ÙÙØ­ Ø¯Ø±Ø¬Ø§Øª Ø¬Ø²Ø¦ÙØ© ÙÙ 10 ÙÙØ¶Ø­ Ø§ÙØ£Ø®Ø·Ø§Ø¡ Ø¨Ø§ÙÙÙØ¬Ø© Ø§ÙØ¹Ø±Ø§ÙÙØ© Ø§ÙÙØ¨Ø³Ø·Ø©. Ø¥Ø°Ø§ Ø£Ù ØµÙØ±Ø© ØºÙØ± ÙÙØ±ÙØ¡Ø© Ø£Ù Ø§ÙØ­Ù ØºÙØ± ÙØ§Ø¨Ù ÙÙØªÙÙÙÙØ Ø§Ø¬Ø¹Ù grade=null Ùneeds_review=true. Ø§ÙÙØªÙØ¬Ø© ÙØ¨Ø¯Ø¦ÙØ© ÙØ§Ø¨ÙØ© ÙÙØ±Ø§Ø¬Ø¹Ø© Ø§ÙÙØ¯Ø±ÙØ³. Ø£Ø±Ø¬Ø¹ JSON ÙÙØ· Ø¨Ø§ÙØ´ÙÙ {"grade":number|null,"summary":string,"needs_review":boolean,"steps":[{"step":string,"status":string,"feedback":string}]}.`;
  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type':'application/json'},
      body:JSON.stringify({model:process.env.OPENAI_MODEL || 'gpt-4o', temperature:0, response_format:{type:'json_object'}, messages:[
        {role:'system',content:prompt},
        {role:'user',content:[{type:'text',text:'Ø±Ø§Ø¬Ø¹ Ø­Ù Ø§ÙØ·Ø§ÙØ¨ Ø¨Ø­Ø³Ø¨ Ø§ÙØ³Ø¤Ø§Ù.'},{type:'image_url',image_url:{url:data.question}},{type:'image_url',image_url:{url:data.answer}}]}
      ]}), signal:AbortSignal.timeout(90000)
    });
    if (!upstream.ok) return reply(res, 502, {error:'Ø®Ø¯ÙØ© Ø§ÙØªØµØ­ÙØ­ ØºÙØ± ÙØªØ§Ø­Ø© Ø­Ø§ÙÙØ§ÙØ Ø­Ø§ÙÙ ÙØ§Ø­ÙØ§Ù'});
    const payload = await upstream.json();
    const result = JSON.parse(payload.choices?.[0]?.message?.content || '{}');
    if (typeof result.summary !== 'string' || !Array.isArray(result.steps) || typeof result.needs_review !== 'boolean' ||
        !(result.grade === null || (typeof result.grade === 'number' && Number.isFinite(result.grade) && result.grade >= 0 && result.grade <= 10)))
      throw Error('invalid grading response');
    return reply(res, 200, {grade:result.grade, summary:result.summary, needs_review:result.needs_review, steps:result.steps.slice(0,30)});
  } catch { return reply(res, 502, {error:'ØªØ¹Ø°Ø± Ø¥ÙÙØ§Ù Ø§ÙØªØµØ­ÙØ­ Ø­Ø§ÙÙØ§Ù. Ø­Ø§ÙÙ ÙØ±Ø© Ø«Ø§ÙÙØ© Ø£Ù Ø±Ø§Ø¬Ø¹ Ø§ÙÙØ¯Ø±ÙØ³'}); }
});
server.listen(PORT, '0.0.0.0', () => console.log(`MathLab server listening on ${PORT}`));
