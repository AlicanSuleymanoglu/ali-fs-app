// index.js
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import axios from 'axios';
import { Client } from '@hubspot/api-client';
import process from "node:process";
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';




const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SCOPES = process.env.SCOPES;
const FRONTEND_URL = process.env.FRONTEND_URL;
const OPTIONAL_SCOPES = process.env.OPTIONAL_SCOPES;

console.log('CLIENT_ID:', process.env.CLIENT_ID);
console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET);
console.log('REDIRECT_URI:', process.env.REDIRECT_URI);
console.log('SCOPES:', process.env.SCOPES);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('PORT:', process.env.PORT);


app.use(express.json());

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(session({
  secret: 'hubspot_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
}));
// 🔐 Login
app.get('/auth/login', (req, res) => {
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&optional_scope=${OPTIONAL_SCOPES}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});

// ✅ Auth Callback with refresh token
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenRes = await axios.post('https://api.hubapi.com/oauth/v1/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Store the access token, refresh token, and expiration time
    req.session.accessToken = tokenRes.data.access_token;
    req.session.refreshToken = tokenRes.data.refresh_token;
    req.session.expiresIn = Date.now() + tokenRes.data.expires_in * 1000; // Expiration time in milliseconds
    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error("❌ Token exchange failed:", err.response?.data || err.message);
    res.status(500).send('Token exchange failed');
  }
});

// Function to refresh the access token
async function refreshAccessToken(req) {
  try {
    const refreshToken = req.session.refreshToken;
    if (!refreshToken) {
      throw new Error("No refresh token found in session");
    }

    // Request a new access token using the refresh token
    const formData = {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      refresh_token: refreshToken
    };

    const tokenRes = await axios.post('https://api.hubapi.com/oauth/v1/token', null, {
      params: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Update session with new tokens and expiration time
    req.session.accessToken = tokenRes.data.access_token;
    req.session.refreshToken = tokenRes.data.refresh_token; // Update the refresh token if it's new
    req.session.expiresIn = Date.now() + tokenRes.data.expires_in * 1000; // Set new expiration time
    console.log("✅ Access token refreshed");
  } catch (err) {
    console.error("❌ Failed to refresh access token:", err.response?.data || err.message);
    throw new Error("Failed to refresh access token");
  }
}

// Middleware to check token expiration before making a request
async function checkTokenExpiration(req, res, next) {
  if (Date.now() > req.session.expiresIn) {
    // Access token has expired, so refresh it
    try {
      await refreshAccessToken(req);
      console.log("✅ Access token refreshed");
      next();
    } catch (err) {
      console.error("❌ Failed to refresh token:", err);
      res.status(401).json({ error: 'Session expired. Please login again.' });
    }
  } else {
    // Token is still valid
    next();
  }
}



// ✅ Check if logged in TEST CHANGES
app.get('/api/hubspot-data', (req, res) => {
  if (req.session.accessToken) {
    res.status(200).json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// Example of a route using the middleware to ensure valid token
app.get('/api/me', checkTokenExpiration, async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  try {
    const meRes = await axios.get('https://api.hubapi.com/oauth/v1/access-tokens/' + token, {
      headers: { Authorization: `Bearer ${token}` }
    });

    res.json({
      user_id: meRes.data.user_id,
      hubId: meRes.data.hub_id,
      name: meRes.data.user,
      email: meRes.data.user_email
    });
  } catch (err) {
    console.error("❌ Failed to fetch HubSpot user:", err.response?.data || err.message);
    res.status(500).send('Could not retrieve user info');
  }
});



// ✅ Get meetings by user WITH contactId, companyId, and dealId
app.post('/api/meetings', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const { ownerId, startTime, endTime } = req.body;
  console.log("📩 Incoming body:", req.body);

  try {
    const response = await axios.post('https://api.hubapi.com/crm/v3/objects/meetings/search', {
      filterGroups: [{
        filters: [
          { propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId },
          { propertyName: "hs_meeting_start_time", operator: "GTE", value: startTime },
          { propertyName: "hs_meeting_start_time", operator: "LTE", value: endTime }
        ]
      }],
      properties: [
        "hs_object_id",
        "hs_timestamp",
        "hs_meeting_title",
        "hubspot_owner_id",
        "hs_internal_meeting_notes",
        "hs_meeting_location",
        "hs_meeting_start_time",
        "hs_meeting_end_time",
        "hs_meeting_outcome",
        "hs_activity_type"
      ],
      limit: 100
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const meetingsWithDetails = await Promise.all(
      response.data.results.map(async (meeting) => {
        const { id, properties } = meeting;

        let companyName = 'Unknown Company';
        let companyAddress = 'Unknown Address';
        let companyId = null;

        let contactName = 'Unknown Contact';
        let contactPhone = '';
        let contactId = null;

        let dealId = null;

        // Fetch associated company
        try {
          const assocRes = await axios.get(
            `https://api.hubapi.com/crm/v3/objects/meetings/${id}/associations/companies`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          companyId = assocRes.data.results?.[0]?.id || null;
          if (companyId) {
            const companyRes = await axios.get(
              `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=name,address,address1,address_street,city`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            companyName = companyRes.data.properties.name || 'Unnamed Company';

            // Combine street address and city
            const street =
              companyRes.data.properties.address || '';
            const city = companyRes.data.properties.city || '';

            if (street && city) {
              companyAddress = `${street}, ${city}`;
            } else if (street) {
              companyAddress = street;
            } else if (city) {
              companyAddress = city;
            } else {
              companyAddress = 'Unknown Address';
            }
          }
        } catch (e) {
          console.warn(`⚠️ Could not fetch company for meeting ${id}`);
        }

        // Fetch associated contact
        try {
          const assocContactRes = await axios.get(
            `https://api.hubapi.com/crm/v3/objects/meetings/${id}/associations/contacts`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          contactId = assocContactRes.data.results?.[0]?.id || null;
          if (contactId) {
            const contactRes = await axios.get(
              `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,phone`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            contactName = `${contactRes.data.properties.firstname || ''} ${contactRes.data.properties.lastname || ''}`.trim();
            contactPhone = contactRes.data.properties.phone || '';
          }
        } catch (e) {
          console.warn(`⚠️ Could not fetch contact for meeting ${id}`);
        }

        // Fetch associated deal
        try {
          const dealsRes = await axios.get(
            `https://api.hubapi.com/crm/v4/objects/meetings/${id}/associations/deals`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          dealId = dealsRes.data.results?.[0]?.toObjectId || null;
        } catch (e) {
          console.warn(`⚠️ Could not fetch deal for meeting ${id}`);
        }

        const date = new Date(properties.hs_meeting_start_time).toLocaleDateString('de-DE');

        return {
          id,
          title: properties.hs_meeting_title || 'Untitled',
          startTime: properties.hs_meeting_start_time,
          endTime: properties.hs_meeting_end_time,
          date,
          address: companyAddress || 'No location',
          status: properties.hs_meeting_outcome || 'scheduled',
          type: properties.hs_activity_type || 'meeting',
          companyName,
          companyId,
          contactName,
          contactPhone,
          contactId,
          dealId,
          internalNotes: properties.hs_internal_meeting_notes || ''
        };
      })
    );

    res.json({ results: meetingsWithDetails });
  } catch (err) {
    console.error("❌ HubSpot API error:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});




// ✅ Get one meeting by ID
app.get('/api/meeting/:id', async (req, res) => {
  console.log("Raw Start Time:", rawStartTime);
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const meetingId = req.params.id;

  const hubspotClient = new Client({ accessToken: token });

  try {
    const result = await hubspotClient.crm.objects.meetings.basicApi.getById(meetingId, [
      "hs_meeting_title",
      "hs_meeting_start_time",
      "hs_meeting_end_time",
      "hs_meeting_location",
      "hs_meeting_outcome",
      "hs_activity_type",
      "dealId"
    ]);

    res.json({
      id: result.id,
      ...result.properties
    });
  } catch (err) {
    console.error("❌ Failed to fetch meeting by ID:", err.message);
    res.status(404).send("Meeting not found");
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


//Company Search
app.get('/api/companies/search', async (req, res) => {
  const token = req.session.accessToken;
  const query = req.query.q;

  if (!token) return res.status(401).send('Not authenticated');
  if (!query) return res.status(400).send('Missing query');

  const hubspotClient = new Client({ accessToken: token });

  try {
    const result = await hubspotClient.crm.companies.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'name',
          operator: 'CONTAINS_TOKEN',
          value: query
        }]
      }],
      properties: ['name', 'address', 'city', 'state', 'zip'],
      limit: 10
    });

    const companies = result.results.map(c => ({
      id: c.id,
      name: c.properties.name || 'Unnamed Company',
      address: `${c.properties.address || ''} ${c.properties.city || ''} ${c.properties.state || ''} ${c.properties.zip || ''}`.trim()
    }));

    res.json({ results: companies });
  } catch (err) {
    console.error("❌ Failed to search companies:", err.message);
    res.status(500).send("Search failed");
  }
});

// create contact
// POST /api/hubspot/contacts/create
app.post('/api/hubspot/contacts/create', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const { firstName, lastName, email, phone, companyId } = req.body;
  if (!firstName || !lastName || !email || !companyId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const hubspotClient = new Client({ accessToken: token });

  try {
    // 1. Create the contact
    const contactRes = await hubspotClient.crm.contacts.basicApi.create({
      properties: { firstname: firstName, lastname: lastName, email, phone }
    });

    const contactId = contactRes.id;

    // 2. Associate with the company
    await hubspotClient.crm.companies.associationsApi.create(
      companyId,
      "contacts",
      [{ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 1 }] }]
    );

    res.json({ id: contactId });
  } catch (err) {
    console.error("❌ Failed to create contact or associate:", err.response?.data || err.message);
    res.status(500).json({ error: "Contact creation failed" });
  }
});


app.post('/api/meetings/create', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const hubspotClient = new Client({ accessToken: token });

  let ownerId = req.session.ownerId;
  if (!ownerId) {
    try {
      const whoami = await axios.get(`https://api.hubapi.com/oauth/v1/access-tokens/${token}`);
      ownerId = whoami.data.user_id;
      console.log("🔁 Fetched ownerId from HubSpot token:", ownerId);
    } catch (err) {
      console.error("❌ Failed to fetch user_id from access token:", err.response?.data || err.message);
      return res.status(400).json({ error: 'Could not resolve owner ID' });
    }
  }

  let {
    title,
    companyId,
    contactId,
    dealId,
    meetingType,
    startTime,
    endTime,
    notes,
  } = req.body;

  console.log("📤 Incoming meeting create request:", {
    title, companyId, contactId, dealId, meetingType, startTime, endTime, notes, ownerId
  });

  // No matter what, if a contactId is present, we will associate it to the meeting
  // You can optionally still auto-fetch one if none is passed in

  if (!contactId && companyId) {
    try {
      const contactAssocRes = await axios.get(
        `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/contacts?limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const contacts = contactAssocRes.data.results;
      if (contacts?.length > 0) {
        contactId = contacts[0].id;
        console.log("🔄 Auto-selected contactId:", contactId);
      }
    } catch (err) {
      console.error("⚠️ Could not auto-fetch contactId from company:", err.response?.data || err.message);
    }
  }

  // Now always push associations
  const associations = [];
  if (companyId) {
    associations.push({ to: { id: companyId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 188 }] });
  }
  if (contactId) {
    associations.push({ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 200 }] });
  }
  if (dealId) {
    associations.push({ to: { id: dealId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 212 }] });
  }


  console.log("🔗 Associations for meeting:", JSON.stringify(associations, null, 2));

  try {
    const isPastMeeting = startTime < Date.now(); // Check if the meeting is in the past
    const meetingOutcome = isPastMeeting ? "COMPLETED" : "SCHEDULED";

    const meetingRes = await hubspotClient.crm.objects.meetings.basicApi.create({
      properties: {
        hs_meeting_title: title,
        hs_meeting_start_time: startTime,
        hs_meeting_end_time: endTime,
        hs_timestamp: startTime,
        hs_activity_type: meetingType,
        hs_internal_meeting_notes: notes || '',
        hubspot_owner_id: ownerId,
        hs_meeting_outcome: meetingOutcome,
      },
      associations
    });

    console.log("✅ Meeting created successfully:", meetingRes.id);
    res.json({ success: true, meetingId: meetingRes.id, isPastMeeting });

  } catch (err) {
    console.error("❌ Failed to create meeting:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create meeting', details: err.response?.data || err.message });
  }
});




// Cancel a meeting (set outcome to CANCELED)
app.post('/api/meeting/:id/cancel', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const hubspotClient = new Client({ accessToken: token });
  const meetingId = req.params.id;

  try {
    await hubspotClient.crm.objects.meetings.basicApi.update(meetingId, {
      properties: {
        hs_meeting_outcome: "CANCELED"
      }
    });
    console.log("Checking basicApi:", typeof hubspotClient.crm.objects.meetings.basicApi);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to cancel meeting:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to cancel meeting' });
  }
});


// Send Voice Note to Zapier
const upload = multer(); // memory storage

app.post('/api/meeting/send-voice', upload.single('audio'), async (req, res) => {
  console.log('req.file:', req.file);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file received' });
    }

    const formData = new FormData();

    formData.append('audio', req.file.buffer, {
      filename: req.file.originalname || 'voice-note.webm',
      contentType: req.file.mimetype,
      knownLength: req.file.size,
    });

    // ✅ Add forwarded metadata
    formData.append('userId', req.body.userId || 'unknown');
    formData.append('meetingId', req.body.meetingId || '');
    formData.append('companyId', req.body.companyId || '');
    formData.append('dealId', req.body.dealId || '');
    formData.append('contactId', req.body.contactId || '');

    const zapierResponse = await fetch('https://hooks.zapier.com/hooks/catch/20863141/2pdsjyw/', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!zapierResponse.ok) {
      const txt = await zapierResponse.text();
      console.error('Zapier responded with', zapierResponse.status, txt);
      return res.status(500).json({ error: 'Zapier webhook failed', zapierStatus: zapierResponse.status, zapierBody: txt });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to forward audio to Zapier:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


const upload_contract = multer(); // In-memory storage



// Upload Contract
app.post('/api/meeting/:meetingId/upload-contract', upload_contract.single('contract'), async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const { meetingId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No contract uploaded' });

  let dealId = req.body.dealId; // Try from frontend first
  const additionalNote = req.body.note?.trim();
  console.log("dealId:", dealId, "additionalNote:", additionalNote);

  if (!dealId) {
    try {
      const dealsRes = await axios.get(
        `https://api.hubapi.com/crm/v4/objects/meetings/${meetingId}/associations/deals`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dealId = dealsRes.data.results?.[0]?.toObjectId;
      if (!dealId) {
        return res.status(400).json({ error: 'No associated deal found for this meeting.' });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Failed to find deal associated with this meeting.' });
    }
  }

  try {
    // Prepare form-data for HubSpot file upload
    const fileFormData = new FormData();
    fileFormData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'contract.pdf',
      contentType: req.file.mimetype,
    });
    fileFormData.append('options', JSON.stringify({
      access: "PRIVATE",
      name: req.file.originalname || "Contract",
    }));
    fileFormData.append('folderId', "189440789850");

    // Upload file to HubSpot
    const fileRes = await axios.post(
      'https://api.hubapi.com/files/v3/files',
      fileFormData,
      {
        headers: {
          ...fileFormData.getHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    const fileId = fileRes.data.id;

    // Compose note body with "Paper Quote:" followed by a line break and additional notes (if any)
    let noteBody = "Paper Quote:\n";
    if (additionalNote) noteBody += additionalNote;

    // Create a note and associate with the deal
    const noteRes = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/notes',
      {
        properties: {
          hs_note_body: noteBody,
          hs_attachment_ids: fileId,
          hs_timestamp: Date.now()
        },
        associations: [
          {
            to: { id: dealId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED",
                associationTypeId: 214
              }
            ]
          }
        ]
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    res.json({ success: true, noteId: noteRes.data.id, fileId });
  } catch (err) {
    console.error("❌ Failed to upload contract and create note:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to upload contract', details: err.response?.data || err.message });
  }
});


// Closed Lost Reason Form
app.patch('/api/deal/:dealId/close-lost', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');
  const { dealId } = req.params;
  const { deal_stage, closed_lost_reason } = req.body;
  const hubspotClient = new Client({ accessToken: token });

  try {
    await hubspotClient.crm.deals.basicApi.update(dealId, {
      properties: {
        dealstage: "closedlost", // Use 'dealstage' (HubSpot internal property)
        closed_lost_reason,    // Make sure this property exists in your HubSpot portal!
      },
    });
    res.json({ success: true });
  } catch (err) {
    // Add more detailed error logging:
    console.error("❌ Failed to update deal:", err.response?.data || err.message, err.stack);
    res.status(500).json({ error: 'Failed to update deal', details: err.response?.data || err.message });
  }
});

// Closed Won Reason Form
app.patch('/api/deal/:dealId/close-won', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const { dealId } = req.params;
  const { deal_stage, closed_won_reason, pos_competitor, payment_competitor } = req.body;

  // Required fields
  if (!deal_stage || !closed_won_reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Build properties object for HubSpot
    const properties = {
      closed_won_reason: closed_won_reason,
    };
    // Optional competitor fields if present
    if (pos_competitor) properties.pos_competitor = pos_competitor;
    if (payment_competitor) properties.payment_competitor = payment_competitor;

    // HubSpot PATCH update
    const updateRes = await axios.patch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      { properties },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ success: true, updated: updateRes.data });
  } catch (err) {
    console.error("Failed to update deal as closed won:", err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to update deal',
      details: err.response?.data || err.message,
    });
  }
});


// Set Completed Meeting
app.post('/api/meeting/:id/mark-completed', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const hubspotClient = new Client({ accessToken: token });
  const meetingId = req.params.id;

  try {
    await hubspotClient.crm.objects.meetings.basicApi.update(meetingId, {
      properties: {
        hs_meeting_outcome: "COMPLETED"
      }
    });
    setMeetings((prev) => prev.map(meeting => meeting.id === meetingId ? { ...meeting, status: 'completed' } : meeting));

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to cancel meeting:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to complete meeting' });
  }
});



// Fetch all tasks for the logged-in user (salesperson)
app.post('/api/tasks', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const { ownerId } = req.body;
  console.log("📩 Incoming task fetch body:", req.body);

  try {
    const response = await axios.post('https://api.hubapi.com/crm/v3/objects/tasks/search', {
      filterGroups: [{
        filters: [
          { propertyName: "hubspot_owner_id", operator: "EQ", value: ownerId },
          { propertyName: "hs_task_status", operator: "NEQ", value: "COMPLETED" },
          { propertyName: "hs_task_subject", operator: "CONTAINS_TOKEN", value: "Followup Task" }
        ]
      }],
      properties: [
        "hs_object_id",
        "hs_task_subject",
        "hs_task_body",
        "hs_task_status",
        "hubspot_owner_id",
        "hs_task_priority",
        "hs_task_due_date",
        "hs_timestamp"
      ],
      limit: 100
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("🟢 Tasks fetched:", response.data.results.length);

    const tasks = await Promise.all(response.data.results.map(async (task) => {
      const taskId = task.id;
      let restaurantName = 'Unknown Restaurant';
      let contactName = '';
      let email = '';
      let phoneNumber = '';
      let cuisine = '';
      let dealId = '';
      let companyId = '';
      let contactId = '';
      let meetingId = '';
      console.log("📦 HubSpot Task Properties:", task.properties);


      // === 🔗 Fetch associated company ===
      try {
        const assocCompany = await axios.get(
          `https://api.hubapi.com/crm/v3/objects/tasks/${taskId}/associations/companies`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        companyId = assocCompany.data.results?.[0]?.id;

        if (companyId) {
          const companyDetails = await axios.get(
            `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=name,industry`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          restaurantName = companyDetails.data.properties.name || restaurantName;
          cuisine = companyDetails.data.properties.industry || '';

          // ✅ Fetch associated deals from company
          try {
            const assocDeals = await axios.get(
              `https://api.hubapi.com/crm/v3/objects/companies/${companyId}/associations/deals`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            dealId = assocDeals.data.results?.[0]?.id || '';
            console.log(`🔗 Found deal ${dealId} for company ${companyId}`);
          } catch (err) {
            console.warn(`⚠️ No deal found for company ${companyId}`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ No company for task ${taskId}`);
      }

      // === 📞 Fetch associated contact ===
      try {
        const assocContact = await axios.get(
          `https://api.hubapi.com/crm/v3/objects/tasks/${taskId}/associations/contacts`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        contactId = assocContact.data.results?.[0]?.id;

        if (contactId) {
          const contactDetails = await axios.get(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email,phone`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          contactName = `${contactDetails.data.properties.firstname || ''} ${contactDetails.data.properties.lastname || ''}`.trim();
          email = contactDetails.data.properties.email || '';
          phoneNumber = contactDetails.data.properties.phone || '';
        }
      } catch (err) {
        console.warn(`⚠️ No contact for task ${taskId}`);
      }

      return {
        id: taskId,
        subject: task.properties.hs_task_subject,
        contactName,
        restaurantName,
        cuisine,
        phoneNumber,
        dealId,
        email,
        body: task.properties.hs_task_body || "",
        status: task.properties.hs_task_status,
        dueDate: task.properties.hs_task_due_date || task.properties.hs_timestamp,
        createdAt: task.properties.hs_timestamp,
        ownerId: task.properties.hubspot_owner_id,
        companyId,
        contactId,
      };
    }));

    res.json({ tasks });
  } catch (err) {
    console.error("❌ HubSpot API error:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});



app.patch('/api/meetings/:id/reschedule', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const hubspotClient = new Client({ accessToken: token });
  const meetingId = req.params.id;
  const { startTime, endTime, notes } = req.body;

  try {
    // Send timestamps as strings
    const result = await hubspotClient.crm.objects.meetings.basicApi.update(meetingId, {
      properties: {
        hs_meeting_start_time: String(startTime),
        hs_meeting_end_time: String(endTime),
        hs_timestamp: String(startTime),
        hs_meeting_outcome: "RESCHEDULED",
        hs_internal_meeting_notes: notes || '',
      }
    });
    // Log the FULL response from HubSpot!
    console.log('HubSpot PATCH response:', JSON.stringify(result, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to reschedule meeting:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to reschedule meeting' });
  }
});


// get deals for a company
// Add this to your Express app
app.get('/api/hubspot/company/:companyId/deals', async (req, res) => {
  const token = req.session.accessToken;
  const { companyId } = req.params;

  if (!token) return res.status(401).send('Not authenticated');

  const hubspotClient = new Client({ accessToken: token });

  try {
    const assocRes = await hubspotClient.crm.associations.v4.basicApi.getPage(
      'companies',
      companyId,
      'deals',
      undefined,
      100
    );

    const dealIds = assocRes.results.map(r => r.toObjectId);
    if (!dealIds.length) return res.json([]);

    const dealDetails = await hubspotClient.crm.deals.batchApi.read({
      inputs: dealIds.map(id => ({ id })),
      properties: ['dealname', 'dealstage', 'pipeline'],
    });

    const salesPipelineDeals = dealDetails.results.filter(
      deal => deal.properties.pipeline === 'default' // adjust if your pipeline ID differs
    );

    res.json(salesPipelineDeals);
  } catch (err) {
    console.error("❌ Error fetching deals for company:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch deals', details: err.response?.data || err.message });
  }
});

// get conctacts of a copmany
app.get('/api/hubspot/company/:companyId/contacts', async (req, res) => {
  const token = req.session.accessToken;
  const { companyId } = req.params;

  if (!token) return res.status(401).send('Not authenticated');
  if (!companyId) return res.status(400).send('Missing company ID');

  const hubspotClient = new Client({ accessToken: token });

  try {
    // Get associated contact IDs (v4)
    const assocRes = await hubspotClient.crm.associations.v4.basicApi.getPage(
      'companies',
      companyId,
      'contacts',
      undefined,
      100
    );

    const contactIds = assocRes.results.map(r => r.toObjectId);
    if (!contactIds.length) return res.json([]);

    // Fetch contact details
    const contactDetails = await hubspotClient.crm.contacts.batchApi.read({
      inputs: contactIds.map(id => ({ id })),
      properties: ['firstname', 'lastname', 'email', 'phone']
    });

    res.json(contactDetails.results);
  } catch (err) {
    console.error("❌ Failed to fetch associated contacts:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch associated contacts', details: err.response?.data || err.message });
  }
});


app.post('/api/hubspot/deals/create', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const hubspotClient = new Client({ accessToken: token });

  let ownerId = req.session.ownerId;
  if (!ownerId) {
    try {
      const whoami = await axios.get(`https://api.hubapi.com/oauth/v1/access-tokens/${token}`);
      ownerId = whoami.data.user_id;
      console.log("🔁 Fetched ownerId from token:", ownerId);
    } catch (err) {
      console.error("❌ Could not resolve ownerId", err.response?.data || err.message);
      return res.status(400).json({ error: 'Could not resolve owner ID' });
    }
  }

  const {
    dealName,
    pipeline,
    stage,
    companyId,
    contactId
  } = req.body;

  const associations = [
    {
      to: { id: companyId },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 5 }]
    }
  ];

  if (contactId) {
    associations.push({
      to: { id: contactId },
      types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }]
    });
  }

  try {
    const response = await hubspotClient.crm.deals.basicApi.create({
      properties: {
        dealname: dealName,
        pipeline: pipeline || 'default',
        dealstage: stage || 'appointmentscheduled',
        hubspot_owner_id: ownerId,
        sdr_owner: ownerId
      },
      associations
    });

    console.log("✅ Deal created:", response.id);
    res.json({ success: true, id: response.id });
  } catch (err) {
    console.error("❌ Failed to create deal:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create deal', details: err.response?.data || err.message });
  }
});


// create task 
app.post('/api/hubspot/tasks/create', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const {
    taskDate,
    companyId,
    contactId,
    dealId,
    companyName,
    ownerId,
    meetingId,
  } = req.body;
  console.log("📩 Creating task for company", companyId);

  if (!taskDate || !companyId || !contactId || !dealId || !companyName || !ownerId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const hubspot = new Client({ accessToken: token });

  const taskPayload = {
    properties: {
      hs_timestamp: taskDate,
      hs_task_body: req.body.taskBody?.trim() || `Followup with the restaurant ${companyName} (${meetingId})`,
      hubspot_owner_id: ownerId,
      hs_task_subject: `Followup Task - ${companyName}`,
      hs_task_status: "NOT_STARTED",
      hs_task_priority: "MEDIUM",
      hs_task_type: "CALL",
    },
    associations: [
      {
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }]
      },
      {
        to: { id: companyId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 192 }]
      },
      {
        to: { id: dealId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 216 }]
      }
    ]
  };

  try {
    const response = await hubspot.crm.objects.tasks.basicApi.create(taskPayload);
    console.log("✅ Task created:", response.id);
    res.json({ success: true, taskId: response.id });
  } catch (err) {
    console.error("❌ Failed to create task:", err.response?.body || err.message);
    res.status(500).json({ error: "Failed to create task", details: err.response?.body || err.message });
  }
});


app.post('/api/hubspot/contact/create', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const hubspotClient = new Client({ accessToken: token });

  let ownerId = req.session.ownerId;
  if (!ownerId) {
    try {
      const whoami = await axios.get(`https://api.hubapi.com/oauth/v1/access-tokens/${token}`);
      ownerId = whoami.data.user_id;
    } catch (err) {
      return res.status(400).json({ error: 'Could not resolve owner ID' });
    }
  }

  const { firstName, lastName, email, phone, companyId } = req.body;

  try {
    // Step 1: Create the contact
    const contactRes = await hubspotClient.crm.contacts.basicApi.create({
      properties: {
        firstname: firstName,
        lastname: lastName,
        email,
        phone,
        hubspot_owner_id: ownerId
      }
    });

    const contactId = contactRes.id;

    // Step 2: Use axios to call v4 endpoint for default association
    await axios.put(
      `https://api.hubapi.com/crm/v4/objects/contact/${contactId}/associations/default/company/${companyId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("✅ Contact created and associated:", contactId);
    res.json({ success: true, id: contactId });
  } catch (err) {
    console.error("❌ Failed to create or associate contact:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create or associate contact', details: err.response?.data || err.message });
  }
});


// set task to completed
app.post('/api/hubspot/tasks/complete', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');


  const { taskId } = req.body;
  console.log("🛠️ Updating taskId:", taskId);


  try {
    const hubspot = new Client({ accessToken: token });

    await hubspot.crm.objects.tasks.basicApi.update(taskId, {
      properties: {
        hs_task_status: "COMPLETED"
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error completing task:", err);
    res.status(500).json({ error: "Failed to complete task" });
  }
});


// Move Deal to Qualified to Buy
app.patch('/api/deal/:dealId/in-negotiation', async (req, res) => {
  const token = req.session.accessToken;
  if (!token) return res.status(401).send('Not authenticated');

  const { dealId } = req.params;

  try {
    // Update deal stage to "qualifiedtobuy"
    const properties = { dealstage: "qualifiedtobuy" };

    // HubSpot PATCH update
    const updateRes = await axios.patch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      { properties },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ success: true, updated: updateRes.data });
  } catch (err) {
    console.error("Failed to update deal stage to 'Qualified to Buy':", err.response?.data || err.message);
    res.status(500).json({
      error: 'Failed to update deal stage',
      details: err.response?.data || err.message,
    });
  }
});



app.get('/api/contacts/search', async (req, res) => {
  const token = req.session.accessToken;
  const query = req.query.q;

  if (!token) return res.status(401).send('Not authenticated');
  if (!query) return res.status(400).send('Missing query parameter');

  const hubspotClient = new Client({ accessToken: token });

  try {
    const result = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'lastname',
              operator: 'CONTAINS_TOKEN',
              value: query
            }
          ]
        }
      ],
      properties: ['firstname', 'lastname', 'email', 'phone', 'mobilephone', 'company'],
      limit: 20,
    });


    console.log('HubSpot API Response:', result);  // Add this log to debug

    const contacts = result.results.map((c) => ({
      id: c.id,
      fullName: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim(),
      firstName: c.properties.firstname,
      lastName: c.properties.lastname,
      email: c.properties.email,
      phone: c.properties.phone,
      mobilePhone: c.properties.mobilephone,
      companyId: c.associations?.companies?.results?.[0]?.id || null,
    }));

    res.json({ results: contacts });
  } catch (err) {
    console.error("❌ Failed to search contacts:", err.message);
    res.status(500).json({ error: "Search failed" });
  }
});





// Set Deal as Hot Deal
app.patch('/api/deals/:dealId/hot-deal', async (req, res) => {
  const token = req.session.accessToken;
  const { dealId } = req.params;
  const { hot_deal } = req.body;

  if (!token) return res.status(401).send('Not authenticated');
  if (!dealId) return res.status(400).send('Missing deal ID');

  const hubspotClient = new Client({ accessToken: token });

  try {
    await hubspotClient.crm.deals.basicApi.update(dealId, {
      properties: {
        hot_deal: hot_deal ? 'true' : 'false'
      }
    });

    console.log(`✅ Deal ${dealId} set as Hot Deal: ${hot_deal}`);
    res.status(200).json({ success: true, hot_deal });
  } catch (err) {
    console.error("❌ Failed to set hot deal status:", err.message);
    res.status(500).json({ error: "Failed to set hot deal status" });
  }
});


// Task postpone endpoint
app.patch('/api/tasks/:taskId/postpone', async (req, res) => {
  const token = req.session.accessToken;
  const { taskId } = req.params;
  const { newDueDate } = req.body;

  if (!token) return res.status(401).send('Not authenticated');
  if (!taskId) return res.status(400).send('Missing task ID');
  if (!newDueDate) return res.status(400).send('Missing new due date');

  const hubspotClient = new Client({ accessToken: token });

  try {
    // Update the task's due date in HubSpot
    await hubspotClient.crm.objects.tasks.basicApi.update(taskId, {
      properties: {
        hs_timestamp: newDueDate,
      },
    });

    console.log(`✅ Task ${taskId} postponed to ${newDueDate}`);
    res.status(200).json({ success: true, message: "Task postponed successfully" });
  } catch (err) {
    console.error("❌ Error postponing task:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to postpone task" });
  }
});


app.post('/api/companies/create', async (req, res) => {
  const token = req.session.accessToken;
  let ownerId = req.session.ownerId;

  const {
    name,
    street,
    city,
    postalCode,
    state,
    cuisine
  } = req.body;

  // ✅ Check for authentication
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  // ✅ Validate required fields
  if (!name || !street || !city || !postalCode) {
    return res.status(400).json({ error: "Please fill in all required fields" });
  }

  // ✅ Resolve ownerId (from session or via API)
  if (!ownerId) {
    try {
      const whoami = await axios.get(`https://api.hubapi.com/oauth/v1/access-tokens/${token}`);
      ownerId = whoami.data.user_id;
      req.session.ownerId = ownerId; // ✅ Store ownerId in session for future use
      console.log("🔁 Fetched ownerId from token:", ownerId);
    } catch (err) {
      console.error("❌ Could not resolve ownerId:", err.response?.data || err.message);
      return res.status(400).json({ error: 'Could not resolve owner ID' });
    }
  }

  const hubspotClient = new Client({ accessToken: token });

  try {
    // ✅ Create the company in HubSpot
    const response = await hubspotClient.crm.companies.basicApi.create({
      properties: {
        name: name,
        address: street,
        city: city,
        zip: postalCode,
        state_dropdown: state,
        cuisine: cuisine || "",
        hubspot_owner_id: ownerId,       // ✅ Set the owner to the resolved user
      }
    });

    console.log(`✅ New Company Created: ${response.id}`);
    res.status(201).json({
      id: response.id,
      name,
      address: `${street}, ${postalCode} ${city}`,
      state,
      cuisine,
    });

  } catch (err) {
    console.error("❌ Error creating company:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create company" });
  }
});


app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});


// Endpoint to associate a contact with a company
app.post('/api/companies/:companyId/associate-contact', async (req, res) => {
  const token = req.session.accessToken;
  const { companyId } = req.params;
  const { contactId } = req.body;  // Ensure that contactId is sent in the request body

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  if (!contactId || !companyId) {
    return res.status(400).send('Missing required parameters');
  }

  try {
    // Step 2: Use axios to call v4 endpoint for default association
    await axios.put(
      `https://api.hubapi.com/crm/v4/objects/contact/${contactId}/associations/default/company/${companyId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Successfully associated contact with company
    console.log("✅ Contact created and associated:", contactId);
    res.json({ success: true, id: contactId });
  } catch (err) {
    // Handle error from HubSpot API or any other error
    console.error("❌ Failed to create or associate contact:", err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create or associate contact', details: err.response?.data || err.message });
  }
});