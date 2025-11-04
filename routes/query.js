const express = require('express');
const router = express.Router();

const axios = require('axios');
const { GROQ_API_URL, GROQ_API_KEY, GROQ_MODEL } = require('../config');

const openai = require('openai');
const client = new openai.OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: GROQ_API_URL
})

function getSchemaSqlite(db) {
    return new Promise((res, rej) => {
        db.all("SELECT name, sql FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name", [], (e, r) => {
            if (e) return rej(e);
            res(r || []);
        });
    });
}

async function callGroq(prompt) {
  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a SQL generator. Given a database schema and user question, respond ONLY with a single valid SQLite SELECT query. No explanations, no markdown, no prose. The query must be read-only and compatible with SQLite."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error interacting with Groq API:', error);
    return '';
  }
}

function sanitizeSQLReturn(raw) {
  if (!raw) return '';
  return raw
    .replace(/```[\s\S]*?```/g, '') 
    .replace(/^\s*sql\s*/i, '') 
    .replace(/\n+/g, ' ')
    .trim();
}

function validateSQL(sql) {
  if (!sql) return false;
  sql = sql.trim().replace(/;$/, '');
  const forbidden = /\b(insert|update|delete|drop|alter|truncate|create|exec|attach|pragma)\b/i;
  return !forbidden.test(sql);
}

router.get('/', async (req, res) => {
    res.render('index', {question: '', sql: '', rows: [], cols: []});
})

router.post('/query', async (req, res) => {
    const question = (req.body.question || "").trim();
    if(!question) return res.render('index', {question: '', sql: '', rows: [], cols: []});
    const schemaRows = await getSchemaSqlite(req.db);
    const schemaText = schemaRows.map(r => `${r.name}: ${r.sql}`).join('\n');
    const prompt = `You are a SQL generator. Given the database schema below, produce a single READ-ONLY SQLite-compatible SQL SELECT query that asnwer the user's questions. Return only the SQL. Schema:\n${schemaText}\nUser Question: ${question}\nConstraints: Use only existing tables and columns. Use parameter placeholders if needed. No data modification.`;

    let rawSQL = '';
    try {
        rawSQL = await callGroq(prompt);
    }
    catch(e){
        rawSQL = ''; 
    }
    
    rawSQL = sanitizeSQLReturn(rawSQL);
    const ok = validateSQL(rawSQL);
    if(!ok) return res.render('index', {question, sql: 'REJECTED: Unsafe or empty SQL', rows: [], cols: []});

    //if ok
    req.db.all(rawSQL, [], (err, rows) => {
        if(err) return res.render('index', {question, sql: rawSQL, rows: [], cols: []});
        const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
        return res.render('index', {question, sql: rawSQL, rows, cols});
    })
})

module.exports = router;