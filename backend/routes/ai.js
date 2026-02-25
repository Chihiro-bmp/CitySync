const express = require('express');
const router  = express.Router();
const pool    = require('../db/config');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// ── Helper: fetch consumer context from DB ─────────────────────────────────
async function getConsumerContext(userId) {
  const [usageRes, billRes, complaintRes, connRes] = await Promise.all([
    pool.query(`
      SELECT
        us.unit_used, us.time_from, us.time_to,
        LOWER(u.utility_name) AS utility, u.unit_of_measurement,
        ts.rate_per_unit,
        ROUND(us.unit_used * ts.rate_per_unit, 2) AS cost
      FROM usage us
      JOIN utility_connection uc ON us.meter_id  = uc.meter_id
      JOIN tariff t               ON uc.tariff_id = t.tariff_id
      JOIN utility u              ON t.utility_id = u.utility_id
      JOIN tariff_slab ts         ON us.tariff_id = ts.tariff_id
                                 AND us.slab_num  = ts.slab_num
      WHERE uc.consumer_id = $1
      ORDER BY us.time_to DESC LIMIT 36
    `, [userId]),

    pool.query(`
      SELECT
        bd.total_amount, bd.unit_consumed, bd.bill_status,
        bp.bill_period_start, bp.bill_period_end, bp.due_date,
        LOWER(u.utility_name) AS utility
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id     = uc.connection_id
      JOIN tariff t               ON uc.tariff_id        = t.tariff_id
      JOIN utility u              ON t.utility_id        = u.utility_id
      LEFT JOIN bill_postpaid bp  ON bd.bill_document_id = bp.bill_document_id
      WHERE uc.consumer_id = $1
      ORDER BY bd.bill_generation_date DESC LIMIT 24
    `, [userId]),

    pool.query(`
      SELECT status, COUNT(*) AS count
      FROM complaint
      WHERE consumer_id = $1
      GROUP BY status
    `, [userId]),

    pool.query(`
      SELECT LOWER(u.utility_name) AS utility, uc.connection_status, uc.payment_type
      FROM utility_connection uc
      JOIN tariff t  ON uc.tariff_id = t.tariff_id
      JOIN utility u ON t.utility_id = u.utility_id
      WHERE uc.consumer_id = $1
    `, [userId]),
  ]);

  return {
    usage:      usageRes.rows,
    bills:      billRes.rows,
    complaints: complaintRes.rows,
    connections: connRes.rows,
  };
}

// ── Helper: fetch employee context from DB ─────────────────────────────────
async function getEmployeeContext() {
  const [revenueRes, complaintRes, workerRes, connRes] = await Promise.all([
    pool.query(`
      SELECT
        LOWER(u.utility_name)              AS utility,
        r.region_name,
        COUNT(bd.bill_document_id)         AS bill_count,
        SUM(bd.total_amount)               AS total_billed,
        SUM(CASE WHEN bd.bill_status='PAID' THEN bd.total_amount ELSE 0 END) AS collected,
        SUM(CASE WHEN bd.bill_status='UNPAID' THEN bd.total_amount ELSE 0 END) AS outstanding
      FROM bill_document bd
      JOIN utility_connection uc ON bd.connection_id = uc.connection_id
      JOIN tariff t               ON uc.tariff_id    = t.tariff_id
      JOIN utility u              ON t.utility_id    = u.utility_id
      JOIN meter m                ON uc.meter_id     = m.meter_id
      JOIN address a              ON m.address_id    = a.address_id
      JOIN region r               ON a.region_id     = r.region_id
      GROUP BY u.utility_name, r.region_name
      ORDER BY total_billed DESC
    `),

    pool.query(`
      SELECT
        r.region_name,
        COUNT(c.complaint_id)  AS total_complaints,
        SUM(CASE WHEN c.status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN c.status = 'Pending'  THEN 1 ELSE 0 END) AS pending
      FROM complaint c
      JOIN utility_connection uc ON c.connection_id = uc.connection_id
      JOIN meter m               ON uc.meter_id     = m.meter_id
      JOIN address a             ON m.address_id    = a.address_id
      JOIN region r              ON a.region_id     = r.region_id
      GROUP BY r.region_name
      ORDER BY total_complaints DESC
    `),

    pool.query(`
      SELECT
        p.first_name || ' ' || p.last_name AS worker_name,
        fw.expertise,
        COUNT(c.complaint_id)              AS complaints_handled,
        SUM(CASE WHEN c.status='Resolved' THEN 1 ELSE 0 END) AS resolved,
        ROUND(
          100.0 * SUM(CASE WHEN c.status='Resolved' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(c.complaint_id), 0), 1
        )                                  AS resolution_rate
      FROM field_worker fw
      JOIN person p     ON fw.person_id   = p.person_id
      LEFT JOIN complaint c ON fw.person_id = c.assigned_to
      GROUP BY fw.person_id, p.first_name, p.last_name, fw.expertise
      ORDER BY resolved DESC
    `),

    pool.query(`
      SELECT
        LOWER(u.utility_name)     AS utility,
        uc.connection_status,
        COUNT(*)                  AS count
      FROM utility_connection uc
      JOIN tariff t  ON uc.tariff_id = t.tariff_id
      JOIN utility u ON t.utility_id = u.utility_id
      GROUP BY u.utility_name, uc.connection_status
    `),
  ]);

  return {
    revenue:     revenueRes.rows,
    complaints:  complaintRes.rows,
    workers:     workerRes.rows,
    connections: connRes.rows,
  };
}

// ── POST /api/ai/consumer ──────────────────────────────────────────────────
router.post('/consumer', async (req, res) => {
  const { question, history = [] } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });

  try {
    const ctx = await getConsumerContext(req.user.userId);

    const systemPrompt = `You are an intelligent utility advisor for CitySync, a utility management platform in Dhaka, Bangladesh.

You have access to the consumer's complete utility data. Give concise, actionable, friendly advice. Use Bangladeshi context (৳ for currency). Be specific with numbers from the data. Format responses clearly but conversationally — no long walls of text. Use bullet points sparingly, only when listing 3+ items.

CONSUMER DATA:
Connections: ${JSON.stringify(ctx.connections)}
Recent Usage (last 36 records): ${JSON.stringify(ctx.usage)}
Recent Bills (last 24): ${JSON.stringify(ctx.bills)}
Complaints summary: ${JSON.stringify(ctx.complaints)}`;

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: question },
    ];

    const response = await callClaude(systemPrompt, messages);
    res.json({ answer: response });
  } catch (err) {
    console.error('AI consumer error:', err);
    res.status(500).json({ error: 'AI assistant unavailable' });
  }
});

// ── POST /api/ai/employee ──────────────────────────────────────────────────
router.post('/employee', async (req, res) => {
  const { question, history = [] } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });

  try {
    const ctx = await getEmployeeContext();

    const systemPrompt = `You are a sharp business analyst for CitySync, a utility company in Dhaka, Bangladesh.

You have access to company-wide operational data. Give concise executive-level insights. Use ৳ for currency. Be direct about problems and opportunities. Format responses clearly — use bullet points only for lists of 3+. Lead with the most important insight.

COMPANY DATA:
Revenue by utility & region: ${JSON.stringify(ctx.revenue)}
Complaints by region: ${JSON.stringify(ctx.complaints)}
Field worker performance: ${JSON.stringify(ctx.workers)}
Connection stats: ${JSON.stringify(ctx.connections)}`;

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: question },
    ];

    const response = await callClaude(systemPrompt, messages);
    res.json({ answer: response });
  } catch (err) {
    console.error('AI employee error:', err);
    res.status(500).json({ error: 'AI assistant unavailable' });
  }
});

// ── Anthropic API call ─────────────────────────────────────────────────────
async function callClaude(systemPrompt, messages) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system:     systemPrompt,
    messages,
  });

  return response.content[0].text;
}

module.exports = router;