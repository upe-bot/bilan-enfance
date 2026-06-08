const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const ADMIN_PWD = process.env.ADMIN_PWD || 'defi2026admin';

// ── AUTH MIDDLEWARE ──
function requireAdmin(req, res, next) {
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PWD) return res.status(401).json({ error: 'Non autorisé' });
  next();
}

// ── SEND EMAIL VIA BREVO ──
async function sendBrevoEmail({ to, subject, htmlContent, replyTo }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Défi Enfance', email: 'noreply@defienf.fr' },
      to: Array.isArray(to) ? to : [to],
      replyTo: replyTo || { email: 'contact@defienfance.fr' },
      subject,
      htmlContent
    })
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error('Brevo error: ' + err);
  }
  return response.json();
}

// ── EMAIL TEMPLATES ──
function buildEmailHtml({ prenom, lien, type, dateLimit }) {
  const solikendBadge = `
    <div style="background:linear-gradient(135deg,#fb0089,#ef6135);border-radius:16px;padding:20px 24px;margin:24px 0;text-align:center;color:white;">
      <div style="font-size:28px;margin-bottom:8px">🎁</div>
      <div style="font-family:sans-serif;font-size:16px;font-weight:900;letter-spacing:0.5px;margin-bottom:6px">TIRAGE AU SORT — 16 JUIN</div>
      <div style="font-family:sans-serif;font-size:13px;line-height:1.5;opacity:0.95">
        Parmi tous les répondants, <strong>1 gagnant</strong> remportera une <strong>carte cadeau Solikend 250€</strong><br>
        pour un séjour dans un hôtel partenaire où <strong>100% du paiement</strong> est reversé à l'association de votre choix.
      </div>
    </div>`;

  const footer = `
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #f0e8e8;font-family:sans-serif;font-size:11px;color:#999;text-align:center;line-height:1.6">
      🔒 Réponses anonymes · Résultats agrégés uniquement<br>
      Défi Enfance / Union pour l'Enfance / Esperancia<br>
      <a href="mailto:contact@defienfance.fr" style="color:#fb0089">contact@defienfance.fr</a>
    </div>`;

  const templates = {
    premier_envoi: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="text-align:center;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #f0e0ee">
          <div style="display:inline-block;background:linear-gradient(135deg,#fb0089,#ef6135);border-radius:30px;padding:10px 24px">
            <span style="font-family:Arial,sans-serif;font-size:18px;font-weight:900;color:#ffffff;letter-spacing:0.5px">Défi Enfance</span>
          </div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#999;margin-top:6px">Générateur de victoires pour l'enfance</div>
        </div>
        <h1 style="font-family:sans-serif;font-size:24px;font-weight:900;color:#1a0a00;margin-bottom:8px">Bonjour ${prenom} 👋</h1>
        <p style="font-size:15px;color:#3a3a3a;line-height:1.6;margin-bottom:16px">
          Merci d'avoir participé au <strong>Défi Enfance 2026</strong> ! Votre engagement fait la différence pour des milliers d'enfants.
        </p>
        <p style="font-size:15px;color:#3a3a3a;line-height:1.6;margin-bottom:16px">
          Prenez <strong>3 à 5 minutes</strong> pour remplir le <strong>Bilan Enfance</strong> — un baromètre inédit de l'engagement des organisations pour l'enfance.
        </p>
        ${solikendBadge}
        <div style="text-align:center;margin:28px 0">
          <a href="${lien}" style="display:inline-block;background:linear-gradient(135deg,#fb0089,#ef6135);color:white;font-family:sans-serif;font-size:15px;font-weight:900;padding:16px 36px;border-radius:14px;text-decoration:none;box-shadow:0 4px 18px rgba(251,0,137,0.3)">
            Remplir mon Bilan Enfance →
          </a>
        </div>
        <p style="font-size:13px;color:#999;text-align:center">Date limite : <strong>${dateLimit}</strong> · Ce lien est personnel, il ne peut être utilisé qu'une seule fois.</p>
        <div style="background:#fff4fb;border-left:3px solid #fb0089;border-radius:8px;padding:12px 16px;margin-top:16px;font-size:12px;color:#666;line-height:1.6">
          📬 <strong>Vous partagez cette adresse email avec un autre participant ?</strong> Pas de problème — chaque lien est strictement personnel. Si vous recevez plusieurs emails, chaque lien correspond à une personne différente : transmettez-le à la bonne personne ou remplissez le questionnaire avec elle.
        </div>
        ${footer}
      </div>`,

    remerciement: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-family:sans-serif;font-size:24px;font-weight:900;color:#1a0a00;margin-bottom:8px">Merci ${prenom} ! 🏆</h1>
        <p style="font-size:15px;color:#3a3a3a;line-height:1.6;margin-bottom:16px">
          Votre Bilan Enfance a bien été enregistré. Vous participez au tirage au sort du <strong>16 juin</strong>.
        </p>
        ${solikendBadge}
        <p style="font-size:14px;color:#6b6b6b;line-height:1.6">
          Les résultats agrégés vous seront communiqués après clôture du baromètre.<br>
          Merci pour votre engagement pour l'enfance.
        </p>
        ${footer}
      </div>`,

    relance1: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-family:sans-serif;font-size:24px;font-weight:900;color:#1a0a00;margin-bottom:8px">${prenom}, il reste encore du temps 🕐</h1>
        <p style="font-size:15px;color:#3a3a3a;line-height:1.6;margin-bottom:16px">
          Vous n'avez pas encore rempli votre Bilan Enfance. Il ne prend que <strong>3 à 5 minutes</strong> et votre voix compte.
        </p>
        ${solikendBadge}
        <div style="text-align:center;margin:28px 0">
          <a href="${lien}" style="display:inline-block;background:linear-gradient(135deg,#fb0089,#ef6135);color:white;font-family:sans-serif;font-size:15px;font-weight:900;padding:16px 36px;border-radius:14px;text-decoration:none">
            Je remplis mon Bilan →
          </a>
        </div>
        <p style="font-size:13px;color:#999;text-align:center">Date limite : <strong>${dateLimit}</strong></p>
        ${footer}
      </div>`,

    relance2: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h1 style="font-family:sans-serif;font-size:24px;font-weight:900;color:#1a0a00;margin-bottom:8px">Plus que quelques jours, ${prenom} ⏳</h1>
        <p style="font-size:15px;color:#3a3a3a;line-height:1.6;margin-bottom:16px">
          Le Bilan Enfance ferme le <strong>${dateLimit}</strong>. Ne passez pas à côté du tirage au sort Solikend !
        </p>
        ${solikendBadge}
        <div style="text-align:center;margin:28px 0">
          <a href="${lien}" style="display:inline-block;background:linear-gradient(135deg,#fb0089,#ef6135);color:white;font-family:sans-serif;font-size:15px;font-weight:900;padding:16px 36px;border-radius:14px;text-decoration:none">
            Remplir mon Bilan →
          </a>
        </div>
        ${footer}
      </div>`,

    derniere_relance: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
          <strong style="color:#856404">⚠️ Dernier jour — fermeture ce soir à 23h59</strong>
        </div>
        <h1 style="font-family:sans-serif;font-size:24px;font-weight:900;color:#1a0a00;margin-bottom:8px">C'est la dernière chance, ${prenom}</h1>
        <p style="font-size:15px;color:#3a3a3a;line-height:1.6;margin-bottom:16px">
          Le Bilan Enfance ferme <strong>ce soir à 23h59</strong>. Le tirage au sort a lieu demain matin.
        </p>
        ${solikendBadge}
        <div style="text-align:center;margin:28px 0">
          <a href="${lien}" style="display:inline-block;background:linear-gradient(135deg,#fb0089,#ef6135);color:white;font-family:sans-serif;font-size:15px;font-weight:900;padding:16px 36px;border-radius:14px;text-decoration:none">
            Je participe maintenant →
          </a>
        </div>
        ${footer}
      </div>`
  };

  return templates[type] || templates.premier_envoi;
}

// ── ROUTES ──

// Envoyer un email (ou plusieurs)
app.post('/send-email', requireAdmin, async (req, res) => {
  try {
    const { recipients, type, dateLimit } = req.body;
    // recipients = [{ email, prenom, lien }]
    const results = [];
    for (const r of recipients) {
      const prenomNom = [r.prenom, r.nom].filter(Boolean).join(' ');
      const prefix = prenomNom ? `${prenomNom} — ` : '';
      const subjects = {
        premier_envoi: `${prefix}Votre Bilan Enfance — tirage au sort 250€ Solikend 🎁`,
        remerciement: `${prefix}Merci pour votre Bilan Enfance ! 🏆`,
        relance1: `${prefix}Votre Bilan Enfance vous attend encore`,
        relance2: `${prefix}Plus que quelques jours — fermeture le ${dateLimit}`,
        derniere_relance: `${prefix}⏰ Dernier jour — Bilan Enfance ferme ce soir`
      };
      try {
        await sendBrevoEmail({
          to: [{ email: r.email, name: r.prenom }],
          subject: subjects[type] || subjects.premier_envoi,
          htmlContent: buildEmailHtml({ prenom: r.prenom, lien: r.lien, type, dateLimit: dateLimit || '15 juin 23h59' })
        });
        results.push({ email: r.email, status: 'sent' });
      } catch(e) {
        results.push({ email: r.email, status: 'error', message: e.message });
      }
      // Délai pour respecter les limites Brevo
      await new Promise(r => setTimeout(r, 100));
    }
    res.json({ success: true, results });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Envoyer email de remerciement auto (appelé par le formulaire)
app.post('/send-merci', async (req, res) => {
  try {
    const { email, prenom, lien } = req.body;
    if (!email || !prenom) return res.status(400).json({ error: 'email et prenom requis' });
    await sendBrevoEmail({
      to: [{ email, name: prenom }],
      subject: 'Merci pour votre Bilan Enfance ! 🏆',
      htmlContent: buildEmailHtml({ prenom, lien: lien || '', type: 'remerciement', dateLimit: '15 juin 23h59' })
    });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Vérifier mot de passe admin
app.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PWD) res.json({ ok: true });
  else res.status(401).json({ ok: false });
});

// Health check
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Bilan Enfance API' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bilan Enfance API running on port ${PORT}`));
